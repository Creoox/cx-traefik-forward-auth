import { beforeEach, describe, expect, it, jest } from "@jest/globals";
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
  authCache,
  getProviderEndpoints,
  getJwkKeys,
} from "../../src/services/preAuth";

jest.mock("axios");

const testOidcEndpoints: OidcConfigEndpoints = {
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

const testJwks: Array<RsaJkwsUriKey | EcJkwsUriKey> = [
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
];

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
    if (authCache.has(CACHE_PROVIDER_ENDPOINTS)) {
      authCache.del(CACHE_PROVIDER_ENDPOINTS);
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

    // TODO: workaround with overwriting authCache - in future use stub instead
    if (authCache.has(CACHE_PROVIDER_ENDPOINTS)) {
      authCache.del(CACHE_PROVIDER_ENDPOINTS);
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
    // TODO: workaround with overwriting authCache - in future use stub instead
    if (!authCache.has(CACHE_PROVIDER_ENDPOINTS)) {
      authCache.set(CACHE_PROVIDER_ENDPOINTS, testOidcEndpoints);
    }
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: { keys: testJwks },
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
    // TODO: workaround with overwriting authCache - in future use stub instead
    expect(authCache.has(CACHE_PROVIDER_JWKS)).toBe(true);

    const jwks = await getJwkKeys();
    expect(axios.get).not.toHaveBeenCalled();
    expect(jwks).toEqual(testJwks);
  });

  it("then - if stubbed (empty) cache, reads JWKS from providers jwks_uri endpoint.", async () => {
    const newJwks: Array<RsaJkwsUriKey | EcJkwsUriKey> = testJwks.filter(
      (_, index) => index == 0
    );
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: { keys: newJwks },
        status: 200,
      })
    );

    // TODO: workaround with overwriting authCache - in future use stub instead
    if (!authCache.has(CACHE_PROVIDER_ENDPOINTS)) {
      authCache.set(CACHE_PROVIDER_ENDPOINTS, testOidcEndpoints);
    }
    if (authCache.has(CACHE_PROVIDER_JWKS)) {
      authCache.del(CACHE_PROVIDER_JWKS);
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

  it("lastly - throws error if no jwks_uri endpoints was found.", async () => {
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: "Not found",
        status: 404,
      })
    );

    // TODO: workaround with overwriting authCache - in future use stub instead
    if (!authCache.has(CACHE_PROVIDER_ENDPOINTS)) {
      authCache.set(CACHE_PROVIDER_ENDPOINTS, testOidcEndpoints);
    }
    if (authCache.has(CACHE_PROVIDER_JWKS)) {
      authCache.del(CACHE_PROVIDER_JWKS);
    }
    await expect(getJwkKeys()).rejects.toThrow(Error);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
