import axios from "axios";
import { createLocalJWKSet, jwtVerify } from "jose";
import type { JSONWebKeySet, JWTPayload } from "jose";

import { OidcTokenCoreBody, InactiveOidcToken } from "../models/authModel";
import { getJwkKeys } from "./preAuth";

export const getRandomString = (length: number) => {
  let randomString = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    randomString += possible.charAt(
      Math.floor(Math.random() * possible.length)
    );
  }
  return randomString;
};

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
    console.error(err);
    throw err;
  }
};

export const verifyTokenViaJwt = async (token: string): Promise<JWTPayload> => {
  if (!token.includes(".")) {
    throw new Error("JWT token must contain at least one period `.`!");
  }
  const JWKS = createLocalJWKSet((await getJwkKeys()) as JSONWebKeySet);

  const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
    issuer: process.env.OIDC_ISSUER_URL,
    // audience: process.env.OIDC_CLIENT_ID,
  });
  return payload;
};

export const verifyTokenViaIntrospection = async (token: string) => {
  if (!token.includes(".")) {
    throw new Error("JWT token must contain at least one period `.`!");
  }
};
