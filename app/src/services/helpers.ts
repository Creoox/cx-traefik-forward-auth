export const getRandomString = (length: number) => {
  let randomString = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    randomString += possible.charAt(
      Math.floor(Math.random() * possible.length)
    );
  }
  return randomString;
};

/**
 * Retruns object with environment variables.
 *
 * @param port port for current server
 * @param loginWhenNoToken
 * @param prod
 * @returns object with environment variables
 */
export const getEnvInfo = (
  port: string | number,
  loginWhenNoToken: boolean,
  isProd: boolean
): any => ({
  service: process.env.APP_NAME || "cx-traefik-forward-auth",
  serviceVersion: process.env.APP_VERSION || "1.0.0",
  servicePort: port,
  hostUri: process.env.HOST_URI,
  oidcIssuerUrl: process.env.OIDC_ISSUER_URL,
  oidcClientId: process.env.OIDC_CLIENT_ID,
  oidcValidationType: process.env.OIDC_VALIDATION_TYPE,
  loginWhenNoToken: loginWhenNoToken ? loginWhenNoToken : undefined,
  environment: !isProd ? process.env.NODE_ENV : undefined,
});

export const getStateParam = (url: string, authEndpoint: string): string => {
  return url
    .replace(authEndpoint + "?", "")
    .split("&")
    .filter(
      (param) => param.includes("state=") && !param.includes("session_state=")
    )[0]
    .replace("state=", "");
};
