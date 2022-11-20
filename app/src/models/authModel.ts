/**
 * Available encription algorithms. Mind that symetric keys (e.g.`HS256`) are
 * deliberately disabled.
 *
 * @see https://stackoverflow.com/questions/39239051/rs256-vs-hs256-whats-the-difference
 * @todo add support for eliptic algorithms (e.g. `ES256`)
 */
const jwkAlgTypes = [
  "PS256",
  "PS384",
  "PS512",
  "RS256",
  "RS384",
  "RS512",
  "RSA-OAEP",
] as const;
type JwkAlgType = typeof jwkAlgTypes[number];

/**
 * Available JWK kty (Key Type) parameters.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7517#section-4.1
 */
const jwkKtyTypes = ["RSA", "EC"] as const;
type JwkKtyType = typeof jwkKtyTypes[number];

/**
 * Available JWK use (Public Key Use) parameters.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7517#section-4.2
 */
const jwkUseTypes = ["sig", "enc"] as const;
type JwkUseType = typeof jwkUseTypes[number];

export interface OidcConfigEndpoints {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  introspection_endpoint?: string;
  userinfo_endpoint?: string;
}

export interface OidcTokenCorePayload {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  scope: string | string[];
  email: string;
}

export interface ActiveOidcToken extends OidcTokenCorePayload {
  active: boolean;
}
export interface InactiveOidcToken {
  active: boolean;
}

interface JkwsUriKey {
  kid: string;
  kty: JwkKtyType;
  alg: JwkAlgType;
  use: JwkUseType;
  x5c?: string[];
  x5t?: string;
  "x5t#S256"?: string;
}

export interface RsaJkwsUriKey extends JkwsUriKey {
  n: string; // public `modulus` parameter
  e: string; // public `exponent` parameter
}

export interface EcJkwsUriKey extends JkwsUriKey {
  crv: string; // cryptographic curve
  x: string; // x coordinate for the elliptic curve point
  y: string; // y coordinate for the elliptic curve point
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

/**
 * Validates jkws_uri key (in runtime) if it contains all necessary fields.
 *
 * @param jkwsUriKey jkws_uri key: either RSA or EC
 * @returns true if all necessary fields are present, false otherwise
 */
export function validateJkwsUriKey(
  jkwsUriKey: RsaJkwsUriKey | EcJkwsUriKey
): boolean {
  if (
    !jkwsUriKey.kid ||
    !jkwsUriKey.kty ||
    !jkwsUriKey.alg ||
    !jkwsUriKey.use
  ) {
    return false;
  }
  if (!jwkAlgTypes.includes(jkwsUriKey.alg)) {
    return false;
  }
  if (!jwkKtyTypes.includes(jkwsUriKey.kty)) {
    return false;
  }
  if (!jwkUseTypes.includes(jkwsUriKey.use)) {
    return false;
  }

  const isRsaKey = Boolean(
    (jkwsUriKey as RsaJkwsUriKey).n && (jkwsUriKey as RsaJkwsUriKey).e
  );
  const isEcKey = Boolean(
    (jkwsUriKey as EcJkwsUriKey).crv &&
      (jkwsUriKey as EcJkwsUriKey).x &&
      (jkwsUriKey as EcJkwsUriKey).y
  );
  if (!isRsaKey && !isEcKey) {
    return false;
  }
  return true;
}
