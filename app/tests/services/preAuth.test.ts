import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import axios from "axios";
// import sinon from "sinon";
// import proxyquire from "proxyquire";
// import chai from "chai";

import { withoutKey } from "../utils";
import type {
  OidcConfigEndpoints,
  RsaJkwsUriKey,
  EcJkwsUriKey,
} from "../../src/models/authModel";
import {
  CACHE_PROVIDER_ENDPOINTS,
  CACHE_PROVIDER_JWKS,
  getProviderEndpoints,
  getJwkKeys,
} from "../../src/services/preAuth";
import { initAuthCache, getAuthCache } from "../../src/states/cache";

import { testOidcEndpoints, testJwks } from "../testData";

jest.mock("axios");

describe("Pre-authenticator | Provider Endpoints", () => {
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
  //   getCacheStub.withArgs(CACHE_PROVIDER_ENDPOINTS).returns(testOidcEndpoints);
  //   stub = proxyquire("../../src/services/preAuth.ts", {
  //     "node-cache": stubCache,
  //   });
  // });

  beforeAll(() => {
    initAuthCache();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getAuthCache().flushAll();
  });

  afterAll(() => {
    getAuthCache().flushAll();
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
    if (!getAuthCache().has(CACHE_PROVIDER_ENDPOINTS)) {
      getAuthCache().set(CACHE_PROVIDER_ENDPOINTS, testOidcEndpoints);
    }
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

    // TODO: workaround with overwriting getAuthCache() - in future use stub instead
    if (getAuthCache().has(CACHE_PROVIDER_ENDPOINTS)) {
      getAuthCache().del(CACHE_PROVIDER_ENDPOINTS);
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

  it("lastly - throws error if no providers oidc endpoints were found.", async () => {
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: "Not found",
        status: 404,
      })
    );

    // TODO: workaround with overwriting getAuthCache() - in future use stub instead
    if (getAuthCache().has(CACHE_PROVIDER_ENDPOINTS)) {
      getAuthCache().del(CACHE_PROVIDER_ENDPOINTS);
    }
    await expect(getProviderEndpoints()).rejects.toThrow(Error);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});

describe("Pre-authenticator | JWK Keys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("firstly - reads JWKS from providers jwks_uri endpoint.", async () => {
    // TODO: workaround with overwriting getAuthCache() - in future use stub instead
    if (!getAuthCache().has(CACHE_PROVIDER_ENDPOINTS)) {
      getAuthCache().set(CACHE_PROVIDER_ENDPOINTS, testOidcEndpoints);
    }
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: testJwks,
        status: 200,
      })
    );

    const jwks = await getJwkKeys();
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(testOidcEndpoints.jwks_uri, {
      headers: {
        Accept: "application/json",
      },
    });
    expect(jwks).toEqual(testJwks);
  });

  it("secondly - reads JWKS from cache.", async () => {
    // TODO: workaround with overwriting getAuthCache() - in future use stub instead
    expect(getAuthCache().has(CACHE_PROVIDER_JWKS)).toBe(true);

    const jwks = await getJwkKeys();
    expect(axios.get).not.toHaveBeenCalled();
    expect(jwks).toEqual(testJwks);
  });

  it("then - if stubbed (empty) cache, reads JWKS from providers jwks_uri endpoint.", async () => {
    const newJwks: Array<RsaJkwsUriKey | EcJkwsUriKey> = testJwks.keys.filter(
      (_, index) => index == 0
    );
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: newJwks,
        status: 200,
      })
    );

    // TODO: workaround with overwriting getAuthCache() - in future use stub instead
    if (!getAuthCache().has(CACHE_PROVIDER_ENDPOINTS)) {
      getAuthCache().set(CACHE_PROVIDER_ENDPOINTS, testOidcEndpoints);
    }
    if (getAuthCache().has(CACHE_PROVIDER_JWKS)) {
      getAuthCache().del(CACHE_PROVIDER_JWKS);
    }
    const jwks = await getJwkKeys();
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(testOidcEndpoints.jwks_uri, {
      headers: {
        Accept: "application/json",
      },
    });
    expect(jwks).toEqual(newJwks);
  });

  it("lastly - throws error if no jwks_uri endpoint was found.", async () => {
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: "Not found",
        status: 404,
      })
    );

    // TODO: workaround with overwriting getAuthCache() - in future use stub instead
    if (!getAuthCache().has(CACHE_PROVIDER_ENDPOINTS)) {
      getAuthCache().set(CACHE_PROVIDER_ENDPOINTS, testOidcEndpoints);
    }
    if (getAuthCache().has(CACHE_PROVIDER_JWKS)) {
      getAuthCache().del(CACHE_PROVIDER_JWKS);
    }
    await expect(getJwkKeys()).rejects.toThrow(Error);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
