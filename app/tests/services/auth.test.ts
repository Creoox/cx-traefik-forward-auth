import { afterEach, describe, expect, it, jest } from "@jest/globals";
// import axios from "axios";
import { jwtVerify } from "jose";

import {
  verifyTokenViaJwt,
  verifyTokenViaIntrospection,
} from "../../src/services/auth";
import { getJwkKeys } from "../../src/services/preAuth";

import { testJwks, testTokenPayload } from "../testData";

jest.mock("jose");
jest.mock("../../src/services/preAuth");

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

  it("verifies valid JWK token", async () => {
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
    (jwtVerify as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        payload: testTokenPayload,
        protectedHeader: testProtectedHeader,
      })
    );

    await expect(verifyTokenViaIntrospection(invalidToken)).rejects.toThrow(
      Error
    );
    expect(getJwkKeys).toHaveBeenCalledTimes(0);
    expect(jwtVerify).toHaveBeenCalledTimes(0);
  });
});
