import { BaseClient, Issuer } from "openid-client";
import { LOGIN_AUTH_FLOW } from "../models/dotenvModel";

let oidcClient: BaseClient;

/**
 * Initialize OIDC Client for authentication (log-in). Currently supported
 * Authentication Flows:
 * - Authorization Code Flow (default)
 * - Implicit Flow
 *
 * @todo add Hybrid Flow
 */
export const initOidcClient = async (): Promise<void> => {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL as string);
  if (LOGIN_AUTH_FLOW === "id_token") {
    oidcClient = new issuer.Client({
      client_id: process.env.OIDC_CLIENT_ID as string,
      redirect_uris: [`${process.env.HOST_URI}/_oauth`],
      response_types: [LOGIN_AUTH_FLOW],
    });
  } else {
    oidcClient = new issuer.Client({
      client_id: process.env.OIDC_CLIENT_ID as string,
      client_secret: process.env.OIDC_CLIENT_SECRET
        ? process.env.OIDC_CLIENT_SECRET
        : undefined,
      redirect_uris: [`${process.env.HOST_URI}/_oauth`],
      response_types: ["code"],
      token_endpoint_auth_method: process.env.OIDC_CLIENT_SECRET
        ? "client_secret_post"
        : "none",
    });
  }
};

/**
 * Return OIDC Client.
 *
 * @returns current oidcClient
 * @throws Error if OIDC Client hasn't been initialized.
 */
export const getOidcClient = (): BaseClient => {
  if (!oidcClient) {
    throw new Error("OIDC Client hasn't been initialized.");
  }
  return oidcClient;
};

export const AUTH_ENDPOINT = process.env.AUTH_ENDPOINT || "/_oauth";
