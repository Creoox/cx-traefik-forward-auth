import axios from "axios";
import { Request, Response, NextFunction } from "express";
import type { IncomingHttpHeaders } from "http";
import { createLocalJWKSet, jwtVerify } from "jose";
import type { JSONWebKeySet, JWTPayload } from "jose";
import { generators, TokenSet } from "openid-client";
import qs from "qs";

import { getJwkKeys, getProviderEndpoints } from "./preAuth";
import { AUTH_ENDPOINT, getOidcClient } from "../states/clients";
import { getLoginCache } from "../states/cache";
import { logger } from "./logger";
import { decodeB64, getRandomString } from "./helpers";
import type { ActiveOidcToken, InactiveOidcToken } from "../models/authModel";
import type { LoginSession, LoginCache } from "../models/loginModel";
import {
  LOGIN_AUTH_FLOW,
  LOGIN_SCOPE,
  JWT_TOKEN_TYPE,
} from "../models/dotenvModel";
import { validateTokenRoles } from "./postAuth";

/* eslint-disable  @typescript-eslint/no-non-null-assertion */
const JWT_STRICT_AUDIENCE = ["true", "True", "1"].includes(
  process.env.JWT_STRICT_AUDIENCE!
);

/**
 * Generates authorization url based on two possible flows:
 * - Authorization Code Flow (OIDC-conformant, default)
 * - Implicit Flow (OIDC-conformant)
 *
 * @param headers containing information with original request
 * @param [loginAuthFlow=LOGIN_AUTH_FLOW] optional parameter to set auth flow
 * @returns authorization url
 * @todo add Hybrid Flow
 */
export const genAuthorizationUrl = (
  headers: IncomingHttpHeaders,
  loginAuthFlow: "implicit" | "code" = LOGIN_AUTH_FLOW
): string => {
  let authorizationUrl: string;
  const random_state = getRandomString(24);

  getLoginCache().has(random_state) ? getLoginCache().del(random_state) : null;
  const cacheData: LoginCache = {
    forwardedSchema: headers["x-forwarded-proto"] as string,
    forwardedHost: headers["x-forwarded-host"] as string,
    forwardedUri: headers["x-forwarded-uri"] as string,
  };

  if (loginAuthFlow === "implicit") {
    const nonce = generators.nonce();
    getLoginCache().set(random_state, {
      nonce,
      ...cacheData,
    });

    authorizationUrl = getOidcClient().authorizationUrl({
      scope: LOGIN_SCOPE,
      nonce: nonce,
      state: random_state,
    });
  } else {
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);
    getLoginCache().set(random_state, {
      code_verifier,
      ...cacheData,
    });

    authorizationUrl = getOidcClient().authorizationUrl({
      scope: LOGIN_SCOPE,
      code_challenge: code_challenge,
      code_challenge_method: "S256",
      state: random_state,
    });
  }
  logger.debug(
    `Generted url for flow: ${loginAuthFlow} is: ${authorizationUrl}`
  );
  return authorizationUrl;
};

/**
 * Function handling authorization server callback. Mind the 'state' param.
 * Not included in tests coverage as it part of express feature.
 */
/* istanbul ignore next */
export const handleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.debug(`Call to 'handleCallback' from ${req.url}`);

  const params = getOidcClient().callbackParams(req);
  if (!params.state) {
    next(
      new Error("Missing 'state' parameter in authorization server response.")
    );
  }
  const cache = getLoginCache().get(params.state!) as LoginCache;
  if (!cache) {
    return next("Code has expired. Please login once again.");
  }

  let tokenSet: TokenSet;
  if (LOGIN_AUTH_FLOW === "implicit") {
    tokenSet = await getOidcClient().callback(
      `${process.env.HOST_URI}${AUTH_ENDPOINT}`,
      params,
      { nonce: cache.nonce, state: params.state }
    );
  } else {
    tokenSet = await getOidcClient().callback(
      `${process.env.HOST_URI}${AUTH_ENDPOINT}`,
      params,
      { code_verifier: cache.code_verifier, state: params.state }
    );
  }
  // for some reason we have make a copy
  const token = JSON.parse(JSON.stringify(tokenSet[JWT_TOKEN_TYPE] as string));

  // create login session
  req.session.regenerate((err) => {
    if (err) {
      next(err);
    }
    try {
      const payload = JSON.parse(decodeB64(token.split(".")[1]));
      validateTokenRoles(payload);
      (req.session as LoginSession).token = tokenSet[JWT_TOKEN_TYPE] as string;

      req.session.save((err) => {
        if (err) {
          return next(err);
        }
        if (req.headers["x-forwarded-uri"]) {
          const originSchema = req.headers["x-forwarded-proto"];
          const originHost = req.headers["x-forwarded-host"];
          const originUri = req.headers["x-forwarded-uri"];
          const url = `${originSchema}://${originHost}${originUri}`;
          res.redirect(url);
        } else {
          return next(new Error("Missing `X-Forwarded-Uri` Header"));
        }
      });
    } catch (err) {
      // return Promise.reject(`${err}`);
      res.status(403).send(`${err}`);
    }
  });
};

/**
 * Verify token via JWT - decode it using providers JWK Keys.
 *
 * @param token JWT token (access_token or id_token)
 * @returns decoded token payload
 */
export const verifyTokenViaJwt = async (token: string): Promise<JWTPayload> => {
  if (!token.includes(".")) {
    throw new Error("JWT token must contain at least one period `.`!");
  }
  const JWKS = createLocalJWKSet((await getJwkKeys()) as JSONWebKeySet);

  const stripSlash = (str: string | undefined) => {
    if (str && str[str.length - 1] === "/") {
      return str.substring(0, str.length - 1);
    }
    return str;
  };

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: stripSlash(process.env.OIDC_ISSUER_URL),
    audience: JWT_STRICT_AUDIENCE ? process.env.OIDC_CLIENT_ID : undefined,
  });
  return payload;
};

/**
 * Verify token via Token Introspection - validate token on the
 * provider authorization server.
 *
 * @param token JWT token (access_token or id_token)
 * @returns decoded token payload
 */
export const verifyTokenViaIntrospection = async (token: string) => {

  const providerEndpoints = await getProviderEndpoints();
  try {
    const body = qs.stringify({
      client_id: process.env.OIDC_CLIENT_ID,
      client_secret: process.env.OIDC_CLIENT_SECRET
        ? process.env.OIDC_CLIENT_SECRET
        : undefined,
      token: token,
    });
    const { data, status } = await axios.post<
      ActiveOidcToken | InactiveOidcToken
    >(providerEndpoints.introspection_endpoint!, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    });
    if (status != 200) {
      throw new Error(
        `Provider introspection_endpoint returned status: ${status}`
      );
    }
    return data;
  } catch (err) {
    logger.error(`Provider introspection error: ${err}`);
    throw err;
  }
};
