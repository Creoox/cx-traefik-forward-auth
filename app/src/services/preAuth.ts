import axios from "axios";

import { validateJkwsUriKey } from "../models/authModel";
import type {
  OidcConfigEndpoints,
  RsaJkwsUriKey,
  EcJkwsUriKey,
} from "../models/authModel";
import { initAuthCache, getAuthCache } from "../states/cache";
import { logger } from "./logger";

// Authentication Cache
initAuthCache();
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
        `provider's discovery endpoint returned status: ${status}`
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
        `provider's jwks_uri endpoint returned status: ${status}`
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
  let endpoints: OidcConfigEndpoints | undefined = getAuthCache().get(
    CACHE_PROVIDER_ENDPOINTS
  );

  if (!endpoints) {
    try {
      endpoints = await receiveProviderEndpoints();
      getAuthCache().set(CACHE_PROVIDER_ENDPOINTS, endpoints);
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
    getAuthCache().get(CACHE_PROVIDER_JWKS);

  if (!jwks) {
    try {
      const endpoints = await getProviderEndpoints();
      const jwksUriEndpoint = endpoints.jwks_uri;
      jwks = await receiveJkwsUri(jwksUriEndpoint);
      getAuthCache().set(CACHE_PROVIDER_JWKS, jwks);
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
 * Check if verification via introspection is possible.
 *
 * @throws Error if provider does not expose introspection_endpoint
 */
export const checkIfIntrospectionPossible = async (): Promise<void> => {
  const providerEndpoints = await getProviderEndpoints();
  if (!providerEndpoints.introspection_endpoint) {
    throw new Error("Provider does not expose introspection_endpoint.");
  }
};
