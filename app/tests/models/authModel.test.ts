import { describe, expect, it } from "@jest/globals";

import { withoutKey } from "../utils";
import {
  validateOidcEndpoints,
  validateJkwsUriKey,
} from "../../src/models/authModel";

import {
  obligatoryOidcEndpoints,
  additionalOidcEndpoints,
  validRsaJkwsUriKey,
} from "../testData";

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
