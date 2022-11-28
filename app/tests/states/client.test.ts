import { describe, expect, it } from "@jest/globals";

import { initOidcClient, getOidcClient } from "./../../src/states/clients";

describe("OIDC Client | Initiator", () => {
  it("throws error if OIDC Client hasn't been initialized", () => {
    expect(() => getOidcClient()).toThrow(Error);
  });
});

describe("OIDC Client", () => {
  it("gets initialized OIDC Client", async () => {
    await initOidcClient();
    expect(() => getOidcClient()).not.toThrow(Error);
  });
});
