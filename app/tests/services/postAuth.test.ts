import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { validateTokenPayload } from "./../../src/services/postAuth";
import type {
  ActiveOidcToken,
  InactiveOidcToken,
} from "./../../src/models/authModel";
import { logger } from "../../src/services/logger";

import { testTokenPayload } from "../testData";

const BASE_ENV = process.env;
jest.mock("../../src/services/logger");

describe("Post-Authenticator | Payload Validator", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("validates valid token", () => {
    expect(() => validateTokenPayload(testTokenPayload)).not.toThrow(Error);
  });

  it("throws error for inactive token", () => {
    const inactiveToken: Partial<ActiveOidcToken> | InactiveOidcToken = {
      active: false,
    };
    (logger.error as jest.Mock).mockImplementationOnce(() => {});
    expect(() => validateTokenPayload(inactiveToken)).toThrow(Error);
  });
});

describe("Post-Authenticator | Role Validator", () => {
  afterEach(() => {
    process.env = { ...BASE_ENV };
  });

  it("validates legit roles in token", () => {
    expect(() => validateTokenPayload(testTokenPayload)).not.toThrow(Error);
  });

  it("throws error for missing auth role when demanded", () => {
    const changedToken: Partial<ActiveOidcToken> = {
      ...testTokenPayload,
      resource_access: {
        "dummy-client": {
          roles: ["non-existing-role", "another-role"],
        },
      },
    };
    process.env.AUTH_ROLES_STRUCT = "resource_access.dummy-client.demanded-role.roles";
    process.env.AUTH_ROLE_NAME = "demanded-role";

    expect(() => validateTokenPayload(changedToken)).toThrow(Error);
  });

  it("doesn't throw error for missing auth role when not demanded", () => {
    const changedToken: Partial<ActiveOidcToken> = {
      ...testTokenPayload,
      resource_access: {
        "dummy-client": {
          roles: ["non-existing-role", "another-role"],
        },
      },
    };
    process.env.AUTH_ROLES_STRUCT = undefined;
    process.env.AUTH_ROLE_NAME = undefined;
   
    expect(() => validateTokenPayload(changedToken)).not.toThrow(Error);
  });
});
