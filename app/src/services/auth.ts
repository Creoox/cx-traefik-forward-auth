import axios from "axios";
import { createLocalJWKSet, jwtVerify } from "jose";
import type { JSONWebKeySet, JWTPayload } from "jose";

import { OidcTokenCoreBody, InactiveOidcToken } from "../models/authModel";
import { getJwkKeys } from "./preAuth";
import { logger } from "./logger";

const JWT_STRICT_AUDIENCE = ["true", "True", "1"].includes(
  process.env.JWT_STRICT_AUDIENCE!
);

/**
 * Validates access token in opaque way.
 *
 * @param accessToken if empty then connectorId has to be set
 * @returns promise to ConnectorData for given connector
 */
export const introspectToken = async (
  accessToken: string
): Promise<OidcTokenCoreBody | InactiveOidcToken> => {
  if (accessToken === "") {
    throw new Error("Field `accessToken` cannot be empty!");
  }
  const queryString = ``;
  try {
    const { data, status } = await axios.post<
      OidcTokenCoreBody | InactiveOidcToken
    >(`/connectors?${queryString}`, {
      baseURL: process.env.OIDC_ISSUER_URL,
      headers: {
        Accept: "application/json",
      },
    });
    if (status != 200) {
      throw new Error(`introspectToken returned status: ${status}`);
    }
    return data;
  } catch (err) {
    logger.error(err);
    throw err;
  }
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

  const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
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
 * @todo
 */
export const verifyTokenViaIntrospection = async (token: string) => {
  if (!token.includes(".")) {
    throw new Error("JWT token must contain at least one period `.`!");
  }
};
