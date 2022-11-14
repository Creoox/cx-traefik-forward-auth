import axios from "axios";

import { OidcConfigEndpoints } from "../models/authModel";

/**
 * Reads providers oidc endpoints.
 *
 * @returns providers oidc endpoints
 */
export const getProviderEndpoints = async (): Promise<OidcConfigEndpoints> => {
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
      throw new Error(`openid-configuration endpoint returned status: ${status}`);
    }
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
