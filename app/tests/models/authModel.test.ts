import { describe, expect, it } from "@jest/globals";

import { withoutKey } from "../utils";
import {
  validateOidcEndpoints,
  validateJkwsUriKey,
} from "../../src/models/authModel";
import type {
  OidcConfigEndpoints,
  RsaJkwsUriKey,
} from "../../src/models/authModel";

const obligatoryOidcEndpoints: OidcConfigEndpoints = {
  issuer: "https://dev.accounts.dummy.com/realms/dummy",
  authorization_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/auth",
  token_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/token",
  jwks_uri:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/certs",
};

const additionalOidcEndpoints: OidcConfigEndpoints = {
  ...obligatoryOidcEndpoints,
  introspection_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/token/introspect",
  userinfo_endpoint:
    "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/userinfo",
};

const validRsaJkwsUriKey: RsaJkwsUriKey = {
  kid: "0TNVl32y25mLkCoS-cX30727U5DQ1cXx8EkGs-G1TIQ",
  kty: "RSA",
  alg: "RS256",
  use: "sig",
  n: "lVCaCQR0iyM0IgBXMXTidBBtwF0GvBlgnHO7Mb8NIyyiKKPzRfwMtBYqIcUcX_p96hewJ0nE5auE-tZ0HZ34_KSpMkxNN1du3IN2Zhh-Hf0LuxAgXSyfo6xWYQ7KJtMVLecFnYggPA-zf7crWcIE-O_PbrNMMA9ci2eR5GyZlIostR_k63gOsp9Ejfavl0kDNAFLDfeazUW5Rdm0nf5qkuiJOdy26ZvT3gN_Ad5htjB2g7KBDCq72Apxt7c4VwK-icYtEy2nn_zuN1fUDCpXrt8QZ8oG9bL2BiSB2Oi5X1c5rvgOICxoin7HyW63f6OKeNCjoo2BdhylRsum1bqMw",
  e: "AOAB",
};

describe("Validator for issuer OIDC configuration endpoints", () => {
  it("returns true if all the obligatory endpoints are present.", () => {
    expect(validateOidcEndpoints(obligatoryOidcEndpoints)).toBe(true);
  });

  it("returns true if additional endpoints are present.", () => {
    expect(validateOidcEndpoints(additionalOidcEndpoints)).toBe(true);
  });

  it("returns false if any of the obligatory endpoints is missing.", () => {
    const corruptedOidcEndpoints_1 = withoutKey(
      additionalOidcEndpoints,
      "issuer"
    );
    expect(validateOidcEndpoints(corruptedOidcEndpoints_1)).toBe(false);

    const corruptedOidcEndpoints_2 = withoutKey(
      additionalOidcEndpoints,
      "authorization_endpoint"
    );
    expect(validateOidcEndpoints(corruptedOidcEndpoints_2)).toBe(false);

    const corruptedOidcEndpoints_3 = withoutKey(
      additionalOidcEndpoints,
      "token_endpoint"
    );
    expect(validateOidcEndpoints(corruptedOidcEndpoints_3)).toBe(false);

    const corruptedOidcEndpoints_4 = withoutKey(
      additionalOidcEndpoints,
      "jwks_uri"
    );
    expect(validateOidcEndpoints(corruptedOidcEndpoints_4)).toBe(false);
  });
});

describe("Validator for jkws_uri key", () => {
  it("returns true if all the obligatory fields for RSA key are present.", () => {
    expect(validateJkwsUriKey(validRsaJkwsUriKey)).toBe(true);
  });

  it("returns false if any of the obligatory fields for RSA is missing.", () => {
    const corruptedRsaJkwsUriKey_1 = withoutKey(validRsaJkwsUriKey, "kid");
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey_1)).toBe(false);

    const corruptedRsaJkwsUriKey_2 = withoutKey(validRsaJkwsUriKey, "kty");
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey_2)).toBe(false);

    const corruptedRsaJkwsUriKey_3 = withoutKey(validRsaJkwsUriKey, "alg");
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey_3)).toBe(false);

    const corruptedRsaJkwsUriKey_4 = withoutKey(validRsaJkwsUriKey, "use");
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey_4)).toBe(false);

    const corruptedRsaJkwsUriKey_5 = withoutKey(validRsaJkwsUriKey, "n");
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey_5)).toBe(false);

    const corruptedRsaJkwsUriKey_6 = withoutKey(validRsaJkwsUriKey, "e");
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey_6)).toBe(false);
  });

  it("returns false if RSA algorithm is not supported.", () => {
    const corruptedRsaJkwsUriKey = { ...validRsaJkwsUriKey, alg: "HS256" };
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey as any)).toBe(false);
  });

  it("returns false if RSA key type is invalid.", () => {
    const corruptedRsaJkwsUriKey = { ...validRsaJkwsUriKey, kty: "TEST" };
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey as any)).toBe(false);
  });

  it("returns false if RSA public key use is invalid.", () => {
    const corruptedRsaJkwsUriKey = { ...validRsaJkwsUriKey, use: "test" };
    expect(validateJkwsUriKey(corruptedRsaJkwsUriKey as any)).toBe(false);
  });
});

// TODO: add tests for EcJkwsUriKey validation
