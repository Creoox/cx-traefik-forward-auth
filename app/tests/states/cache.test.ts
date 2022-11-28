import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  initAuthCache,
  getAuthCache,
  initLoginCache,
  getLoginCache,
} from "../../src/states/cache";

const testCacheKey = "testCacheKey";
const testCacheValue = { keyOne: "valueOne", keyTwo: "valueTwo" };

describe("Cache initiators", () => {
  it("throws error if Authentication Cache hasn't been initialized", () => {
    expect(() => getAuthCache()).toThrow(Error);
    expect(() => getAuthCache().set(testCacheKey, testCacheValue)).toThrow(
      Error
    );
    expect(() => getAuthCache().get(testCacheKey)).toThrow(Error);
    expect(() => getAuthCache().del(testCacheKey)).toThrow(Error);
  });

  it("throws error if Login Cache hasn't been initialized", () => {
    expect(() => getLoginCache()).toThrow(Error);
    expect(() => getLoginCache().set(testCacheKey, testCacheValue)).toThrow(
      Error
    );
    expect(() => getLoginCache().get(testCacheKey)).toThrow(Error);
    expect(() => getLoginCache().del(testCacheKey)).toThrow(Error);
  });
});

describe("Cache operations | Authentication Cache", () => {
  beforeAll(() => {
    initAuthCache();
  });

  afterAll(() => {
    getAuthCache().flushAll();
  });

  it("sets object-like value into cache properly", () => {
    expect(() => getAuthCache().set(testCacheKey, testCacheValue)).not.toThrow(
      Error
    );
    expect(getAuthCache().has(testCacheKey)).toBe(true);
    expect(getAuthCache().get(testCacheKey)).toEqual(testCacheValue);
  });

  it("resets object-like value into cache properly", () => {
    const newTestCacheValue = {
      newKeyOne: "newValueOne",
      newKeyTwo: "newValueTwo",
    };
    expect(() =>
      getAuthCache().set(testCacheKey, newTestCacheValue)
    ).not.toThrow(Error);
    expect(getAuthCache().has(testCacheKey)).toBe(true);
    expect(getAuthCache().get(testCacheKey)).toEqual(newTestCacheValue);
  });
});

describe("Cache operations | Login Cache", () => {
  beforeAll(() => {
    initLoginCache();
  });

  afterAll(() => {
    getLoginCache().flushAll();
  });

  it("sets object-like value into cache properly", () => {
    expect(() => getLoginCache().set(testCacheKey, testCacheValue)).not.toThrow(
      Error
    );
    expect(getLoginCache().has(testCacheKey)).toBe(true);
    expect(getLoginCache().get(testCacheKey)).toEqual(testCacheValue);
  });

  it("resets object-like value into cache properly", () => {
    const newTestCacheValue = {
      newKeyOne: "newValueOne",
      newKeyTwo: "newValueTwo",
    };
    expect(() =>
      getLoginCache().set(testCacheKey, newTestCacheValue)
    ).not.toThrow(Error);
    expect(getLoginCache().has(testCacheKey)).toBe(true);
    expect(getLoginCache().get(testCacheKey)).toEqual(newTestCacheValue);
  });
});
