import NodeCache from "node-cache";

var loginCache: NodeCache;
var authCache: NodeCache;

/**
 * Initialize Login Cache.
 *
 * @field stdTTL keeps hardcoded expiration time (seconds).
 */
export const initLoginCache = () => {
  loginCache = new NodeCache({ stdTTL: 10 * 60 });
};

/**
 * Return Login Cache.
 *
 * @throws Error if Login Cache hasn't been initialized.
 */
export const getLoginCache = () => {
  if (!loginCache) {
    throw new Error("Login Cache hasn't been initialized.");
  }
  return loginCache;
};

/**
 * Initialize Authentication Cache (for storing server data as JWKS etc.).
 *
 * @field stdTTL keeps hardcoded expiration time (seconds).
 */
export const initAuthCache = () => {
  authCache = new NodeCache({ stdTTL: 60 * 60 });
};

/**
 * Return Authentication Cache.
 *
 * @throws Error if Login Cache hasn't been initialized.
 */
export const getAuthCache = () => {
  if (!authCache) {
    throw new Error("Authentication Cache hasn't been initialized.");
  }
  return authCache;
};
