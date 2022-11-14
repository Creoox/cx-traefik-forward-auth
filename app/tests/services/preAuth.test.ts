import { describe, expect, it } from "@jest/globals";
import axios from "axios";

// import { withoutKey } from "../utils";
import { OidcConfigEndpoints } from "../../src/models/authModel";
import { getProviderEndpoints } from "../../src/services/preAuth";

jest.mock("axios");

const testOidcEndpoints: OidcConfigEndpoints = {
  issuer: "https://dev.accounts.creoox.com/realms/creoox",
  authorization_endpoint:
    "https://dev.accounts.creoox.com/realms/creoox/protocol/openid-connect/auth",
  token_endpoint:
    "https://dev.accounts.creoox.com/realms/creoox/protocol/openid-connect/token",
  jwks_uri:
    "https://dev.accounts.creoox.com/realms/creoox/protocol/openid-connect/certs",
  introspection_endpoint:
    "https://dev.accounts.creoox.com/realms/creoox/protocol/openid-connect/token/introspect",
  userinfo_endpoint:
    "https://dev.accounts.creoox.com/realms/creoox/protocol/openid-connect/userinfo",
};

describe("Pre-authenticator", () => {
  it("reads providers oidc endpoints.", async () => {
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ data: testOidcEndpoints, status: 200 })
    );

    const endpoints = await getProviderEndpoints();
    expect(axios.get).toHaveBeenCalled();
    expect(endpoints).toEqual(testOidcEndpoints);
  });

  it("throws error if status other than 200 was returned.", async () => {
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ data: "Not found", status: 404 })
    );

    await expect(getProviderEndpoints()).rejects.toThrow(Error);
  });
});
