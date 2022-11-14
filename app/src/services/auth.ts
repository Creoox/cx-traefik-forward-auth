import axios from "axios";

import { OidcTokenCoreBody, InactiveOidcToken } from "../models/authModel";

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
