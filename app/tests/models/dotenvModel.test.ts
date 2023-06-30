import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { withoutKey, stringifyObjectValues } from "../utils";
import { validateDotenvFile } from "../../src/models/dotenvModel";
import type { DotenvFile } from "../../src/models/dotenvModel";

const BASE_ENV = process.env;
const dotenvFile: DotenvFile = {
  APP_NAME: "test-name",
  APP_VERSION: "0.7.5",
  APP_PORT: 8080,
  ENVIRONMENT: "production",
  HOST_URI: "http://localhost:4181",
  OIDC_ISSUER_URL: "https://dev.accounts.dummy.com/realms/dummy",
  OIDC_CLIENT_ID: "dummy-id",
  OIDC_CLIENT_SECRET: "dummy-secret",
  OIDC_VERIFICATION_TYPE: "jwt",
  LOGIN_WHEN_NO_TOKEN: false,
  JWT_STRICT_AUDIENCE: false,
  AUTH_ROLES_STRUCT: "groups.special",
  AUTH_ROLE_NAME: "dummy-group",
};

describe("Validator for dotenv files", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...BASE_ENV };
  });

  beforeEach(() => {
    Object.keys(dotenvFile).forEach((key) => {
      delete process.env[key];
    });
  });

  it("passes if obligatory variables are present.", () => {
    process.env = { ...process.env, ...stringifyObjectValues(dotenvFile) };
    expect(() => validateDotenvFile()).not.toThrow(Error);
  });

  it("fails if the `ENVIRONMENT` obligatory variable is missing.", () => {
    const corruptedDotenvFile = withoutKey(dotenvFile, "ENVIRONMENT");
    process.env = {
      ...process.env,
      ...stringifyObjectValues(corruptedDotenvFile),
    };
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `ENVIRONMENT` obligatory variable has a wrong type.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.ENVIRONMENT = "production";
    expect(() => validateDotenvFile()).not.toThrow(Error);

    process.env.ENVIRONMENT = "development";
    expect(() => validateDotenvFile()).not.toThrow(Error);

    process.env.ENVIRONMENT = "invalid-value";
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `HOST_URI` obligatory variable is missing.", () => {
    const corruptedDotenvFile = withoutKey(dotenvFile, "HOST_URI");
    process.env = {
      ...process.env,
      ...stringifyObjectValues(corruptedDotenvFile),
    };
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `LOGIN_WHEN_NO_TOKEN` obligatory variable is missing.", () => {
    const corruptedDotenvFile = withoutKey(dotenvFile, "LOGIN_WHEN_NO_TOKEN");
    process.env = {
      ...process.env,
      ...stringifyObjectValues(corruptedDotenvFile),
    };
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `LOGIN_WHEN_NO_TOKEN` obligatory variable has a wrong type.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    const boolTypes = [true, "true", "True", "1", false, "false", "False", "0"];

    boolTypes.forEach((type) => {
      process.env.LOGIN_WHEN_NO_TOKEN = String(type);
      expect(() => validateDotenvFile()).not.toThrow(Error);
    });
    process.env.LOGIN_WHEN_NO_TOKEN = "-1";
    expect(() => validateDotenvFile()).toThrow(Error);

    process.env.LOGIN_WHEN_NO_TOKEN = "dummy";
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `JWT_STRICT_AUDIENCE` obligatory variable is missing.", () => {
    const corruptedDotenvFile = withoutKey(dotenvFile, "JWT_STRICT_AUDIENCE");
    process.env = {
      ...process.env,
      ...stringifyObjectValues(corruptedDotenvFile),
    };
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `JWT_STRICT_AUDIENCE` obligatory variable has a wrong type.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    const boolTypes = [true, "true", "True", "1", false, "false", "False", "0"];

    boolTypes.forEach((type) => {
      process.env.JWT_STRICT_AUDIENCE = String(type);
      expect(() => validateDotenvFile()).not.toThrow(Error);
    });
    process.env.JWT_STRICT_AUDIENCE = "-1";
    expect(() => validateDotenvFile()).toThrow(Error);

    process.env.JWT_STRICT_AUDIENCE = "dummy";
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `OIDC_ISSUER_URL` obligatory variable is missing.", () => {
    const corruptedDotenvFile = withoutKey(dotenvFile, "OIDC_ISSUER_URL");
    process.env = {
      ...process.env,
      ...stringifyObjectValues(corruptedDotenvFile),
    };
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `OIDC_CLIENT_ID` obligatory variable is missing.", () => {
    const corruptedDotenvFile = withoutKey(dotenvFile, "OIDC_CLIENT_ID");
    process.env = {
      ...process.env,
      ...stringifyObjectValues(corruptedDotenvFile),
    };
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("passes if the `OIDC_CLIENT_SECRET` obligatory variable is missing.", () => {
    const corruptedDotenvFile = withoutKey(dotenvFile, "OIDC_CLIENT_SECRET");
    process.env = {
      ...process.env,
      ...stringifyObjectValues(corruptedDotenvFile),
    };
    expect(() => validateDotenvFile()).not.toThrow(Error);
  });

  it("fails if the `OIDC_VERIFICATION_TYPE` obligatory variable is missing.", () => {
    const corruptedDotenvFile = withoutKey(
      dotenvFile,
      "OIDC_VERIFICATION_TYPE"
    );
    process.env = {
      ...process.env,
      ...stringifyObjectValues(corruptedDotenvFile),
    };
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `OIDC_VERIFICATION_TYPE` obligatory variable has a wrong type.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.OIDC_VERIFICATION_TYPE = "jwt";
    expect(() => validateDotenvFile()).not.toThrow(Error);

    process.env.OIDC_VERIFICATION_TYPE = "introspection";
    expect(() => validateDotenvFile()).not.toThrow(Error);

    process.env.OIDC_VERIFICATION_TYPE = "invalid-value";
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `OIDC_VERIFICATION_TYPE` is `introspection` and client secret is missing.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.OIDC_VERIFICATION_TYPE = "introspection";
    process.env.OIDC_CLIENT_SECRET = undefined;
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `APP_PORT` optional variable has a wrong type.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.APP_PORT = "NaN";
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `AUTH_ROLES_STRUCT` is set but `AUTH_ROLE_NAME` doesn't.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.AUTH_ROLES_STRUCT = "groups";
    process.env.AUTH_ROLE_NAME = undefined;
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("fails if the `AUTH_ROLE_NAME` is set but `AUTH_ROLES_STRUCT` doesn't.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.AUTH_ROLES_STRUCT = undefined;
    process.env.AUTH_ROLE_NAME = "dummy-group";
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("passes if both `AUTH_ROLE_NAME` and `AUTH_ROLES_STRUCT` are set.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.AUTH_ROLES_STRUCT = "groups";
    process.env.AUTH_ROLE_NAME = "dummy-group";
    expect(() => validateDotenvFile()).not.toThrow(Error);
  });

  it("fails if the `JWT_TOKEN_TYPE` is of a wrong type.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.JWT_TOKEN_TYPE = "dummy_type";
    expect(() => validateDotenvFile()).toThrow(Error);
  });

  it("passes valid `JWT_TOKEN_TYPE` types.", () => {
    process.env = {
      ...process.env,
      ...stringifyObjectValues(dotenvFile),
    };
    process.env.JWT_TOKEN_TYPE = "id_token";
    expect(() => validateDotenvFile()).not.toThrow(Error);
    process.env.JWT_TOKEN_TYPE = "access_token";
    expect(() => validateDotenvFile()).not.toThrow(Error);
    process.env.JWT_TOKEN_TYPE = undefined;
    expect(() => validateDotenvFile()).not.toThrow(Error);
  });
});
