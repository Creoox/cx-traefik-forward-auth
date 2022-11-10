import axios from "axios";

import { OidcTokenCoreBody, InactiveOidcToken } from "../models/authModel";

/**
 * Validates access token in opaque way.
 *
 * @param accessToken if empty then connectorId has to be set
 * @returns promise to ConnectorData for given connector
 */
 export const getProviderEndpoints = async (
    accessToken: string
  ): Promise<Required<OidcTokenCoreBody> | InactiveOidcToken> => {
    if (accessToken === "") {
      throw new Error("Field `accessToken` cannot be empty!");
    }
    const queryString = ``;
    try {
      const { data, status } = await axios.post<
        Required<OidcTokenCoreBody> | InactiveOidcToken
      >(`/connectors?${queryString}`, {
        baseURL: process.env.DB_HOST,
        headers: {
          Accept: "application/json",
        },
      });
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

/**
 * Validates access token in opaque way.
 *
 * @param accessToken if empty then connectorId has to be set
 * @returns promise to ConnectorData for given connector
 */
export const introspectToken = async (
  accessToken: string
): Promise<Required<OidcTokenCoreBody> | InactiveOidcToken> => {
  if (accessToken === "") {
    throw new Error("Field `accessToken` cannot be empty!");
  }
  const queryString = ``;
  try {
    const { data, status } = await axios.post<
      Required<OidcTokenCoreBody> | InactiveOidcToken
    >(`/connectors?${queryString}`, {
      baseURL: process.env.DB_HOST,
      headers: {
        Accept: "application/json",
      },
    });
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
