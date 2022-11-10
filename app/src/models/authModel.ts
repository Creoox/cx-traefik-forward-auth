export interface OidcConfigEndpoints {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  introspection_endpoint?: string;
  userinfo_endpoint?: string;
}

export interface OidcTokenCoreBody {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  scope: string | string[];
  email: string;
}

export interface InactiveOidcToken {
  active: boolean;
}

/**
 * Validates available OIDC provider endpoints that should be read from
 * `<OIDC_ISSUER_URL>/.well-known/openid-configuration` url.
 * 
 * @param endpoints available OIDC provider endpoints                
 * @returns true if all obligatory endpoints are present, false otherwise
 */
export function validateOidcEndpoints<T extends OidcConfigEndpoints>(
  endpoints: T
): boolean {
  if (
    !endpoints.issuer ||
    !endpoints.authorization_endpoint ||
    !endpoints.token_endpoint ||
    !endpoints.jwks_uri
  ) {
    return false;
  }
  return true;
}
