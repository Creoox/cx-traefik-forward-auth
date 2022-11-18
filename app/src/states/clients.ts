import { BaseClient, Issuer } from "openid-client";

let oidcClient: BaseClient;

/**
 * Initialize OIDC Client for authentication (log-in).
 */
export const initOidcClient = async (): Promise<void> => {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL as string);
  oidcClient = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID!,
    client_secret: process.env.OIDC_CLIENT_SECRET
      ? process.env.OIDC_CLIENT_SECRET
      : undefined,
    redirect_uris: [`${process.env.HOST_URI}/_oauth`],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
};

/**
 * Return OIDC Client.
 *
 * @throws Error if OIDC Client hasn't been initialized.
 */
export const getOidcClient = () => {
  if (!oidcClient) {
    throw new Error("OIDC Client hasn't been initialized.");
  }
  return oidcClient;
};

export const AUTH_ENDPOINT = process.env.AUTH_ENDPOINT || "/_oauth";
