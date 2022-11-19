import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { validateTokenPayload } from "./../../src/services/postAuth";
import type {
  ActiveOidcToken,
  InactiveOidcToken,
} from "./../../src/models/authModel";
import { logger } from "../../src/services/logger";

jest.mock("../../src/services/logger");

describe("Post-Authenticator | Payload Validator", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("throws error for inactive token", () => {
    const inactiveToken: Partial<ActiveOidcToken> | InactiveOidcToken = {
      active: false,
    };
    (logger.error as jest.Mock).mockImplementationOnce(() => {});
    expect(() => validateTokenPayload(inactiveToken)).toThrow(Error);
  });
});
