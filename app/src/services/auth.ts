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
import { getRandomString } from "./helpers";
import type { ActiveOidcToken, InactiveOidcToken } from "../models/authModel";
import type { LoginSession, LoginCache } from "../models/loginModel";
import { LOGIN_AUTH_FLOW, LOGIN_SCOPE } from "../models/dotenvModel";

/* eslint-disable  @typescript-eslint/no-non-null-assertion */
const JWT_STRICT_AUDIENCE = ["true", "True", "1"].includes(
  process.env.JWT_STRICT_AUDIENCE!
);

/**
 * Generates authorization url based on two possible flows:
 * - Authorization Code Flow (default)
 * - Implicit Flow
 *
 * @param headers containing information with original request.
 * @returns authorization url
 * @todo add Hybrid Flow
 */
export const genAuthorizationUrl = (headers: IncomingHttpHeaders) => {
  let authorizationUrl: string;
  const random_state = getRandomString(24);

  getLoginCache().has(random_state) ? getLoginCache().del(random_state) : null;
  const cacheData: LoginCache = {
    forwardedSchema: headers["x-forwarded-proto"] as string,
    forwardedHost: headers["x-forwarded-host"] as string,
    forwardedUri: headers["x-forwarded-uri"] as string,
  };

  if (LOGIN_AUTH_FLOW === "id_token") {
    const nonce = generators.nonce();
    getLoginCache().set(random_state, {
      nonce,
      ...cacheData,
    });

    authorizationUrl = getOidcClient().authorizationUrl({
      scope: LOGIN_SCOPE,
      nonce: nonce,
      response_mode: "form_post",
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
  if (LOGIN_AUTH_FLOW === "id_token") {
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

  // create login session
  req.session.regenerate((err) => {
    if (err) {
      next(err);
    }
    (req.session as LoginSession).access_token = tokenSet.access_token;
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
  });
};

/**
 * Verify token via JWT - decode it using providers JWK Keys.
 *
 * @param token JWT access_token
 * @returns decoded access_token payload
 */
export const verifyTokenViaJwt = async (token: string): Promise<JWTPayload> => {
  if (!token.includes(".")) {
    throw new Error("JWT token must contain at least one period `.`!");
  }
  const JWKS = createLocalJWKSet((await getJwkKeys()) as JSONWebKeySet);

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: process.env.OIDC_ISSUER_URL,
    audience: JWT_STRICT_AUDIENCE ? process.env.OIDC_CLIENT_ID : undefined,
  });
  return payload;
};

/**
 * Verify token via Token Introspection - validate access_token on the
 * provider authorization server.
 *
 * @param token JWT access_token
 * @returns decoded access_token payload
 */
export const verifyTokenViaIntrospection = async (token: string) => {
  if (!token.includes(".")) {
    throw new Error("JWT token must contain at least one period `.`!");
  }

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
