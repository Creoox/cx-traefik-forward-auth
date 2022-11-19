import { beforeEach, describe, expect, it, jest } from "@jest/globals";
// import axios from "axios";
import { jwtVerify } from "jose";

import { verifyTokenViaJwt } from "../../src/services/auth";
import { getJwkKeys } from "../../src/services/preAuth";

import { testJwks, testTokenPayload } from "../testData";

jest.mock("jose");
jest.mock("../../src/services/preAuth");

const testToken = "dummyHeder.dummyBody.dummySign";
const testProtectedHeader = "dummyHeder";

describe("Authenticator | JWK Verifier", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // (axios.get as jest.Mock).mockImplementationOnce(() =>
    //   Promise.resolve({
    //     data: "dummy data",
    //     status: 200,
    //   })
    // );
  });

  it("verifies JWK token", async () => {
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
