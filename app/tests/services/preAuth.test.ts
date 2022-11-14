import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axios from "axios";
// import sinon from "sinon";
// import proxyquire from "proxyquire";
// import chai from "chai";

import { withoutKey } from "../utils";
import { OidcConfigEndpoints } from "../../src/models/authModel";
import { authCache, getProviderEndpoints } from "../../src/services/preAuth";

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
  // let stub: any;

  // TODO: at this point stubbing cache doesn't seem to work...
  // beforeAll(() => {
  //   const sandbox = sinon.createSandbox();
  //   const getCacheStub = sandbox.stub();
  //   const stubCache = sandbox.stub().callsFake(() => {
  //     return {
  //       get: getCacheStub,
  //       set: true,
  //     };
  //   });
  //   getCacheStub.withArgs("providerEndpoints").returns(testOidcEndpoints);
  //   stub = proxyquire("../../src/services/preAuth.ts", {
  //     "node-cache": stubCache,
  //   });
  // });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("firstly - reads providers oidc endpoints from api.", async () => {
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: testOidcEndpoints,
        status: 200,
      })
    );

    const endpoints = await getProviderEndpoints();
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      "/.well-known/openid-configuration",
      {
        baseURL: process.env.OIDC_ISSUER_URL,
        headers: {
          Accept: "application/json",
        },
      }
    );
    expect(endpoints).toEqual(testOidcEndpoints);
  });

  it("secondly - reads providers oidc endpoints from cache.", async () => {
    const endpoints = await getProviderEndpoints();
    expect(axios.get).toHaveBeenCalledTimes(0); // There wasn't a new API call
    expect(endpoints).toEqual(testOidcEndpoints);
  });

  it("then - if stubbed (empty) cache, reads providers oidc endpoints again from api.", async () => {
    const newOidcEndpoints: OidcConfigEndpoints = withoutKey(
      testOidcEndpoints,
      "introspection_endpoint"
    );
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: newOidcEndpoints,
        status: 200,
      })
    );

    // TODO: stub doesn't work...
    // chai
    // .expect(await stub.getProviderEndpoints())
    // .to.eq(withoutKey(testOidcEndpoints, "introspection_endpoint"));

    // TODO: workaround with overwriting authCache - in future use stub instead
    if (authCache.has("providerEndpoints")) {
      authCache.del("providerEndpoints");
    }
    const endpoints = await getProviderEndpoints();
    expect(axios.get).toHaveBeenCalledTimes(1); // There was a new API call
    expect(axios.get).toHaveBeenCalledWith(
      "/.well-known/openid-configuration",
      {
        baseURL: process.env.OIDC_ISSUER_URL,
        headers: {
          Accept: "application/json",
        },
      }
    );
    expect(endpoints).toEqual(newOidcEndpoints);
  });
});
