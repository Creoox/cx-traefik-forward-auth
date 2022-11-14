import axios from "axios";
import NodeCache from "node-cache";

import { OidcConfigEndpoints } from "../models/authModel";

export const authCache = new NodeCache({ stdTTL: 60 * 60 });

/**
 * Calls provider's `openid-configuration` endpoint in order to read their
 * other oidc endpoints.
 *
 * @returns fresh providers oidc endpoints
 */
const receiveProviderEndpoints =
  async (): Promise<OidcConfigEndpoints> => {
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
      console.error(err);
      throw err;
    }
  };

/**
 * Gets providers oidc endpoints either from cache or api.
 *
 * @returns providers oidc endpoints
 */
export const getProviderEndpoints = async (): Promise<OidcConfigEndpoints> => {
  let endpoints: OidcConfigEndpoints | undefined =
    authCache.get("providerEndpoints");

  console.log(endpoints);
  if (!endpoints) {
    try {
      endpoints = await receiveProviderEndpoints();
      authCache.set("providerEndpoints", endpoints);
    } catch (err) {
      throw err;
    }
  }
  return endpoints;
};
