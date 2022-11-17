import axios from "axios";
import NodeCache from "node-cache";
import { BaseClient, Issuer, generators } from "openid-client";

import { validateJkwsUriKey } from "../models/authModel";
import type {
  OidcConfigEndpoints,
  RsaJkwsUriKey,
  EcJkwsUriKey,
} from "../models/authModel";
import { logger } from "./logger";

/**
 * Simple caching mechanism. Exported mostly for testing purposes.
 *
 * @see  "../../tests/services/preAuth.test.ts"
 */
export const authCache = new NodeCache({ stdTTL: 60 * 60 });
export const CACHE_PROVIDER_ENDPOINTS = "providerEndpoints";
export const CACHE_PROVIDER_JWKS = "providerJwks";

/**
 * Calls provider's discovery endpoint (https://YOUR_DOMAIN/.well-known/openid-configuration)
 *  endpoint in order to read their other oidc endpoints.
 *
 * @returns fresh providers oidc endpoints
 */
const receiveProviderEndpoints = async (): Promise<OidcConfigEndpoints> => {
  try {
    const { data, status } = await axios.get<OidcConfigEndpoints>(
      "/.well-known/openid-configuration",
      {
        baseURL: process.env.OIDC_ISSUER_URL,
        headers: {
          Accept: "application/json",
        },
      }
    );
    if (status != 200) {
      throw new Error(
        `openid-configuration endpoint returned status: ${status}`
      );
    }
    return data;
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

/**
 * Calls provider's jwks_uri endpoint in order to read JWK keys.
 *
 * @returns fresh providers oidc endpoints
 */
const receiveJkwsUri = async (
  jkwsUriEndpoint: string
): Promise<Record<"keys", Array<RsaJkwsUriKey | EcJkwsUriKey>>> => {
  try {
    const { data, status } = await axios.get<
      Record<"keys", Array<RsaJkwsUriKey | EcJkwsUriKey>>
    >(jkwsUriEndpoint, {
      headers: {
        Accept: "application/json",
      },
    });
    if (status != 200) {
      throw new Error(
        `openid-configuration endpoint returned status: ${status}`
      );
    }
    return data;
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

/**
 * Gets providers oidc endpoints either from cache or api (discovery endpoint).
 *
 * @returns providers oidc endpoints
 */
export const getProviderEndpoints = async (): Promise<OidcConfigEndpoints> => {
  let endpoints: OidcConfigEndpoints | undefined = authCache.get(
    CACHE_PROVIDER_ENDPOINTS
  );

  if (!endpoints) {
    try {
      endpoints = await receiveProviderEndpoints();
      authCache.set(CACHE_PROVIDER_ENDPOINTS, endpoints);
    } catch (err) {
      throw err;
    }
  }
  return endpoints;
};

/**
 * Gets providers JWK keys either from cache or api (jwks_uri endpoint).
 *
 * @returns JWK keys
 */
export const getJwkKeys = async (): Promise<
  Record<"keys", Array<RsaJkwsUriKey | EcJkwsUriKey>>
> => {
  let jwks: Record<"keys", Array<RsaJkwsUriKey | EcJkwsUriKey>> | undefined =
    authCache.get(CACHE_PROVIDER_JWKS);

  if (!jwks) {
    try {
      const endpoints = await getProviderEndpoints();
      const jwksUriEndpoint = endpoints.jwks_uri;
      jwks = await receiveJkwsUri(jwksUriEndpoint);
      authCache.set(CACHE_PROVIDER_JWKS, jwks);
    } catch (err) {
      throw err;
    }
  }

  let areAllKeysValid = true;
  let isAnyKeyValid = false;
  for (const key in jwks.keys) {
    areAllKeysValid = areAllKeysValid && validateJkwsUriKey(jwks.keys[key]);
    isAnyKeyValid = isAnyKeyValid || validateJkwsUriKey(jwks.keys[key]);
  }

  if (!isAnyKeyValid) {
    logger.error(
      "There is not a valid key in the Provider's jkws_uri endpoint!"
    );
  } else if (!areAllKeysValid) {
    logger.warn(
      "Not all obtained JWK Keys are valid! Make sure it is a valid OIDC provider."
    );
  }
  return jwks;
};

/**
 * Initialize OIDC Client for authentication (log-in).
 *
 * @returns OIDC Client for given provider
 */
export const initOidcClient = async (): Promise<BaseClient> => {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL as string);
  return new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID!,
    client_secret: process.env.OIDC_CLIENT_SECRET
      ? process.env.OIDC_CLIENT_SECRET
      : undefined,
    redirect_uris: [`${process.env.HOST_URI}/_oauth`],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
};
