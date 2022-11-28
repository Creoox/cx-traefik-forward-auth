import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import axios from "axios";
import { jwtVerify } from "jose";
import type { IncomingHttpHeaders } from "http";
import { BaseClient, Issuer } from "openid-client";

import {
  genAuthorizationUrl,
  verifyTokenViaJwt,
  verifyTokenViaIntrospection,
} from "../../src/services/auth";
import { getJwkKeys, getProviderEndpoints } from "../../src/services/preAuth";
import { getOidcClient } from "../../src/states/clients";
import { initLoginCache, getLoginCache } from "../../src/states/cache";
import { logger } from "../../src/services/logger";

import { testJwks, testTokenPayload } from "../testData";

jest.mock("axios");
jest.mock("jose");
jest.mock("../../src/services/preAuth");
jest.mock("../../src/services/logger");
jest.mock("../../src/states/clients");

const testToken = "dummyHeder.dummyPayload.dummySign";
const testProtectedHeader = "dummyHeder";
const testHeaders: IncomingHttpHeaders = {
  "x-forwarded-proto": "https",
  "x-forwarded-host": "test.creoox.com",
  "x-forwarded-uri": "/test-endpoint",
};

const getOidcClientStub = (
  issuer: Issuer<BaseClient>,
  response_types: string[]
): BaseClient => {
  return new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID as string,
    redirect_uris: [`${process.env.HOST_URI}/_oauth`],
    response_types: response_types,
  });
};

describe("Authenticator | URL generator", () => {
  beforeAll(() => {
    initLoginCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    getLoginCache().flushAll();
  });

  it("generates valid 'Authorization Code Flow' url.", async () => {
    const issuerStub = await Issuer.discover(
      process.env.OIDC_ISSUER_URL as string
    );
    (getOidcClient as jest.Mock).mockImplementation(() =>
      getOidcClientStub(issuerStub, ["code"])
    );

    const startCacheKeyNo = getLoginCache().keys().length;
    const authorizationUrl = genAuthorizationUrl(testHeaders, "code");
    const endCacheKeyNo = getLoginCache().keys().length;

    expect(endCacheKeyNo - startCacheKeyNo).toEqual(1);
    expect(authorizationUrl.includes("response_type=code")).toBe(true);
    expect(authorizationUrl.includes("state=")).toBe(true);
  });

  it("generates valid 'Implicit Flow' url.", async () => {
    const issuerStub = await Issuer.discover(
      process.env.OIDC_ISSUER_URL as string
    );
    const clientStub = getOidcClientStub(issuerStub, ["id_token"]);
    (getOidcClient as jest.Mock).mockImplementation(() => clientStub);

    const startCacheKeyNo = getLoginCache().keys().length;
    const authorizationUrl = genAuthorizationUrl(testHeaders, "id_token");
    const endCacheKeyNo = getLoginCache().keys().length;
    console.log(authorizationUrl);

    expect(endCacheKeyNo - startCacheKeyNo).toEqual(1);
    expect(authorizationUrl.includes("response_type=id_token")).toBe(true);
    expect(authorizationUrl.includes("state=")).toBe(true);
    expect(authorizationUrl.includes("nonce=")).toBe(true);
  });

  it("generates 'Authorization Code Flow' for default.", async () => {
    const issuerStub = await Issuer.discover(
      process.env.OIDC_ISSUER_URL as string
    );
    (getOidcClient as jest.Mock).mockImplementation(() =>
      getOidcClientStub(issuerStub, ["code"])
    );

    const authorizationUrl = genAuthorizationUrl(testHeaders);
    expect(authorizationUrl.includes("response_type=code")).toBe(true);
  });
});

describe("Authenticator | JWK Verifier", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("throws error for invalid token structure", async () => {
    const invalidToken = "dummy";
    (getJwkKeys as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(testJwks)
    );
    (jwtVerify as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        payload: testTokenPayload,
        protectedHeader: testProtectedHeader,
      })
    );

    await expect(verifyTokenViaJwt(invalidToken)).rejects.toThrow(Error);
    expect(getJwkKeys).toHaveBeenCalledTimes(0);
    expect(jwtVerify).toHaveBeenCalledTimes(0);
  });

  it("verifies valid JWT token", async () => {
    (getJwkKeys as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(testJwks)
    );
    (jwtVerify as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        payload: testTokenPayload,
        protectedHeader: testProtectedHeader,
      })
    );

    const payload = await verifyTokenViaJwt(testToken);
    expect(getJwkKeys).toHaveBeenCalledTimes(1);
    expect(jwtVerify).toHaveBeenCalledTimes(1);
    expect(payload).toEqual(testTokenPayload);
  });
});

describe("Authenticator | Introspection Verifier", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("throws error for invalid token structure", async () => {
    const invalidToken = "dummy";

    (getJwkKeys as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(testJwks)
    );

    await expect(verifyTokenViaIntrospection(invalidToken)).rejects.toThrow(
      Error
    );
    expect(getJwkKeys).toHaveBeenCalledTimes(0);
  });

  it("passes active JWKT token", async () => {
    const introspection_endpoint = "https://dummy.com/token/introspection";

    (getProviderEndpoints as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ introspection_endpoint })
    );
    (axios.post as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: { active: true },
        status: 200,
      })
    );

    const payload = await verifyTokenViaIntrospection(testToken);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({ active: true });
  });

  it("passes inactive JWKT token", async () => {
    const introspection_endpoint = "https://dummy.com/token/introspection";

    (getProviderEndpoints as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ introspection_endpoint })
    );
    (axios.post as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: { active: false },
        status: 200,
      })
    );

    const payload = await verifyTokenViaIntrospection(testToken);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({ active: false });
  });

  it("throws error if server returned status other than 200", async () => {
    const introspection_endpoint = "https://dummy.com/token/introspection";

    (getProviderEndpoints as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ introspection_endpoint })
    );
    (axios.post as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: "Not found",
        status: 401,
      })
    );
    (logger.error as jest.Mock).mockImplementationOnce(() => {});

    await expect(verifyTokenViaIntrospection(testToken)).rejects.toThrow(Error);
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
