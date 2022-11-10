import { describe, expect, it } from "@jest/globals";

import { withoutKey } from "../utils";
import { validateOidcEndpoints } from "../../src/models/authModel";
import type { OidcConfigEndpoints } from "../../src/models/authModel";

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

describe("Validator for issuer OIDC configuration endpoints", () => {
  it("returns true if obligatory endpoints are present.", () => {
    expect(validateOidcEndpoints(obligatoryOidcEndpoints)).toBe(true);
  });

  it("returns true if additional endpoints are present.", () => {
    expect(validateOidcEndpoints(additionalOidcEndpoints)).toBe(true);
  });

  it("returns false if any of obligatory endpoints is missing.", () => {
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
