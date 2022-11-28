import { describe, expect, it } from "@jest/globals";

import {
  getRandomString,
  getEnvInfo,
  getStateParam,
} from "../../src/services/helpers";

describe("Random string generator", () => {
  it("generates different strings", () => {
    expect(getRandomString(24)).not.toEqual(getRandomString(24));
  });
});

describe("Info", () => {
  it("displays all info data for development environment", () => {
    const infoObject = getEnvInfo(4875, true, false);
    expect(Object.keys(infoObject)).toContain("oidcIssuerUrl");
    expect(Object.keys(infoObject)).toContain("oidcClientId");
    expect(Object.keys(infoObject)).toContain("oidcValidationType");
    expect(Object.keys(infoObject)).toContain("loginWhenNoToken");
    expect(Object.keys(infoObject)).toContain("environment");
    expect(Object.keys(infoObject)).not.toContain("oidcClientSecret");
  });

  it("doesn't display environment info for production", () => {
    const infoObject = getEnvInfo(4875, true, true);
    expect(infoObject.environment).toEqual(undefined);
  });

  it("doesn't display loginWhenNoToken info when false", () => {
    const infoObject = getEnvInfo(4875, false, true);
    expect(infoObject.loginWhenNoToken).toEqual(undefined);
  });
});

describe("State Parameter", () => {
  const getTestUrl = (authEndpoint: string, state: string) =>
    `${authEndpoint}?client_id=dummy&scope=openid%20email&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%2F_oauth&code_challenge=f4xbVH1Xk7U4HDC0_GCKOSx5e8dXtlGIPNtIK0Nq3-g&code_challenge_method=S256&state=${state}`;

  it("gets unwprapped from URL", () => {
    const testState = "X8Sy4GrpeHuCpRJ4Wybac5U8";
    const testAuthEndpoint =
      "https://dev.accounts.dummy.com/realms/dummy/protocol/openid-connect/auth";
    expect(
      getStateParam(getTestUrl(testAuthEndpoint, testState), testAuthEndpoint)
    ).toEqual(testState);
  });
});
