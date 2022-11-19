import { afterEach, describe, expect, it, jest } from "@jest/globals";
import axios from "axios";
import { jwtVerify } from "jose";

import {
  verifyTokenViaJwt,
  verifyTokenViaIntrospection,
} from "../../src/services/auth";
import { getJwkKeys, getProviderEndpoints } from "../../src/services/preAuth";
import { logger } from "../../src/services/logger";

import { testJwks, testTokenPayload } from "../testData";

jest.mock("axios");
jest.mock("jose");
jest.mock("../../src/services/preAuth");
jest.mock("../../src/services/logger");

const testToken = "dummyHeder.dummyPayload.dummySign";
const testProtectedHeader = "dummyHeder";

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
