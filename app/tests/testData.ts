import type {
  OidcTokenCorePayload,
  OidcConfigEndpoints,
  RsaJkwsUriKey,
  EcJkwsUriKey,
} from "../src/models/authModel";

export const obligatoryOidcEndpoints: OidcConfigEndpoints = {
  issuer: "https://dev.accounts.dummy.com/realms/dummy",
  authorization_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/auth",
  token_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/token",
  jwks_uri:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/certs",
};

export const additionalOidcEndpoints: OidcConfigEndpoints = {
  ...obligatoryOidcEndpoints,
  introspection_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/token/introspect",
  userinfo_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/userinfo",
};

export const validRsaJkwsUriKey: RsaJkwsUriKey = {
  kid: "0TNVl32y25mLkCoS-cX30727U5DQ1cXx8EkGs-G1TIQ",
  kty: "RSA",
  alg: "RS256",
  use: "sig",
  n: "lVCaCQR0iyM0IgBXMXTidBBtwF0GvBlgnHO7Mb8NIyyiKKPzRfwMtBYqIcUcX_p96hewJ0nE5auE-tZ0HZ34_KSpMkxNN1du3IN2Zhh-Hf0LuxAgXSyfo6xWYQ7KJtMVLecFnYggPA-zf7crWcIE-O_PbrNMMA9ci2eR5GyZlIostR_k63gOsp9Ejfavl0kDNAFLDfeazUW5Rdm0nf5qkuiJOdy26ZvT3gN_Ad5htjB2g7KBDCq72Apxt7c4VwK-icYtEy2nn_zuN1fUDCpXrt8QZ8oG9bL2BiSB2Oi5X1c5rvgOICxoin7HyW63f6OKeNCjoo2BdhylRsum1bqMw",
  e: "AOAB",
};

export const testOidcEndpoints: OidcConfigEndpoints = {
  issuer: "https://dev.accounts.dummy.com/realms/dummy",
  authorization_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/auth",
  token_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/token",
  jwks_uri:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/certs",
  introspection_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/token/introspect",
  userinfo_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/userinfo",
};

export const testJwks: Record<"keys", Array<RsaJkwsUriKey | EcJkwsUriKey>> = {
  keys: [
    {
      kid: "0TNVl32y36mLkCoS-cX30727D5UQ1cXx8EkGs-G1TIO",
      kty: "RSA",
      alg: "RS256",
      use: "sig",
      n: "lVCaCQR0iyM0IgBXMXTidBDoyQ7GvBlgnHO7Mb8NIyyiKKPzRfwMtBYqIcUcX_p96hewJ0nE5auE-tZ0HZ34_KSpNjxNN1du3IN2Zhh-Hf0LuxAgXSyfo6xWYQ7KJtMVLecFnYggPA-zf7crWcIE-O_PbrNMMA9ci2eR5GyZlNxQEwR_k63gOsp9Ejfavl0kDNAFLDfeazUW5Rdm0nf5qkuiJOdy26ZvT3gN_Da7htjB2g7KBDCq72Apxt7c4VwK-icYtEy2nn_zuN1fUDCpXrt8QZ8oG9bL2BiSB2Oi5X1c5rvgOICxoin7HyW63f6OKeNCjoo2BdhylRsum1bqMw",
      e: "AOAB",
    },
    {
      kid: "8BFiCfAxqRECIZR6mCJDkH-HluamiB0KU8Wa4AMj8uN",
      kty: "RSA",
      alg: "RSA-OAEP",
      use: "enc",
      n: "rvKFkPwbyIhOYPODsToMYIHYImq8Hr9yDHOIAV58BtFSsSmDX-5nxWLbd2fhXDTvTwJT5r0tTR-eVanRWDQJDlnuRICmKQcWAoyfYfkilcQ4mCuEQsqU-F-wHoNxYmv86luapk_zWSAhuxnX6QkdP0a9_GTpKiSFYQOrmx1n5-EYapBDQ0N-8ESJ-qSCIzGdcTo5DKVN83LuOn34HWRZTGJyoAgMLH4vwG9Jw5Nqyn6_DamsNr22wHBqz58C_Du-2nYnN1myUJjUquLu2j5QnZ2_9vBQ6vtzBbW2Z2CnRQa7zDDhTTqKMLqnOCGJVq7vAW-u0mlwlaT-qPYHFsTZCw",
      e: "AOAB",
    },
  ],
};

export const testTokenPayload: Required<OidcTokenCorePayload> & any = {
  exp: 1668775253,
  iat: 1668774953,
  jti: "0c483b11-dc06-4566-8291-cc7b171d5f70",
  iss: "https://dev.accounts.creoox.com/realms/creoox",
  aud: ["account", "dummy-client"],
  sub: "97e0q4db-a4fb-60e2-8eaa-773b6542f77n",
  typ: "Bearer",
  azp: "dummy-client",
  session_state: "c851f0d3-55b6-4zdf-891a-efdb3esfa7e2",
  acr: "1",
  realm_access: {
    roles: ["offline_access", "default-roles-dummy", "uma_authorization"],
  },
  resource_access: {
    "dummy-client": {
      roles: ["dummy-client-admin"],
    },
    account: {
      roles: ["manage-account", "manage-account-links", "view-profile"],
    },
  },
  scope: "openid profile roles email",
  sid: "c852f0d3-57b6-4edf-821a-efdr3e2fa7e2",
  email_verified: false,
  preferred_username: "Dummy",
  email: "dummy@dummy.com",
};
