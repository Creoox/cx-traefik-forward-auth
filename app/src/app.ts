import * as dotenv from "dotenv";
import express, { Application, Request, Response, NextFunction } from "express";
import session from "express-session";
import { generators } from "openid-client";

import { validateDotenvFile } from "./models/dotenvModel";
import { checkIfIntrospectionPossible } from "./services/preAuth";
import {
  handleCallback,
  verifyTokenViaJwt,
  verifyTokenViaIntrospection,
} from "./services/auth";
import { validateTokenPayload } from "./services/postAuth";
import { AUTH_ENDPOINT, initOidcClient, getOidcClient } from "./states/clients";
import { initLoginCache, getLoginCache } from "./states/cache";
import { logger } from "./services/logger";
import { getStateParam, getRandomString, getEnvInfo } from "./services/helpers";

dotenv.config();
const PROD_ENV = "production";
const isProdEnv = process.env.NODE_ENV === PROD_ENV;
const PORT = process.env.APP_PORT || 4181;
const VALIDATION_TYPE =
  process.env.OIDC_VERIFICATION_TYPE === "introspection" ? "intro" : "jwt";
const LOGIN_WHEN_NO_TOKEN = ["true", "True", "1"].includes(
  process.env.LOGIN_WHEN_NO_TOKEN!
);
const COOKIE_NAME = process.env.COOKIE_NAME || "cx_forward_auth";

const app: Application = express();
if (LOGIN_WHEN_NO_TOKEN) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "cyHkxMY0tWDNrxnutdfaNngk",
      name: COOKIE_NAME,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: "auto",
        // domain: process.env.HOST_URI,
        maxAge: 5 * 60 * 1000,
      },
    })
  );
}
app.use(express.json());
app.use(express.static("public"));
app.set("views", "public");
app.set("view engine", "ejs");

/**
 * General session-based authentication middleware. It allows the resource
 * if session cookie is present and not expired.
 */
const isSessionEstablished = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (LOGIN_WHEN_NO_TOKEN && !!(req.session as any).access_token) {
    next();
  } else {
    next("route");
  }
};

/**
 * Main endpoint for session-based authentication. If session check fails,
 * request is handled by the _other_ '/' endpoint
 */
app.get(
  "/",
  isSessionEstablished,
  (req: Request, res: Response, next: NextFunction): void => {
    logger.debug(`Call to '/' (session) from ${req.url}`);

    // /AUTH_ENDPOINT/token endpoint
    if (
      (req.headers["x-forwarded-uri"] as string).includes(
        `${AUTH_ENDPOINT}/token`
      )
    ) {
      res.status(400).render("token/index.ejs", {
        access_token: (req.session as any).access_token,
      });
      return;
    }
    // /AUTH_ENDPOINT/info endpoint
    else if (
      (req.headers["x-forwarded-uri"] as string).includes(
        `${AUTH_ENDPOINT}/info`
      )
    ) {
      res.status(400).json(getEnvInfo(PORT, LOGIN_WHEN_NO_TOKEN, isProdEnv));
      return;
    }
    // /AUTH_ENDPOINT endpoint
    else if (
      (req.headers["x-forwarded-uri"] as string).includes(AUTH_ENDPOINT)
    ) {
      const state = getStateParam(
        req.headers["x-forwarded-uri"] as string,
        AUTH_ENDPOINT
      );

      const cache = getLoginCache().get(state) as any;
      if (!cache) {
        return next("Code has expired. Please login once again.");
      }
      if (!cache.forwardedUri) {
        return next(
          new Error("Missing 'X-Forwarded-Uri' Header in original request")
        );
      }

      const originSchema = cache.forwardedSchema;
      const originHost = cache.forwardedHost;
      const originUri = cache.forwardedUri;
      const url = `${originSchema}://${originHost}${originUri}`;
      res.redirect(url);
      return;
    }
    res.sendStatus(200);
    return;
  }
);

/**
 * Main endpoint for token-based authentication. If LOGIN_WHEN_NO_TOKEN is true
 * it also invokes OIDC Client to get authorization code.
 */
app.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    logger.debug(`Call to '/' from ${req.url}`);
    // Basic feature -> validate bearer token
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization.split(" ");
      if (authHeader.length != 2) {
        isProdEnv
          ? res.status(401).send()
          : res.status(401).render("401/index.ejs");
        return;
      } else if (authHeader[0] !== "Bearer" && authHeader[0] !== "bearer") {
        isProdEnv
          ? res.status(401).send()
          : res.status(401).render("401/index.ejs");
        return;
      }
      try {
        const token = authHeader[1];
        const payload =
          VALIDATION_TYPE === "intro"
            ? await verifyTokenViaIntrospection(token)
            : await verifyTokenViaJwt(token);
        validateTokenPayload(payload);
      } catch (err) {
        logger.error(err);
        isProdEnv
          ? res.status(403).send()
          : res.status(403).render("403/index.ejs");
        return;
      }
      res.sendStatus(200);
      return;
    }
    // Additional feature -> browser-based login
    else if (LOGIN_WHEN_NO_TOKEN) {
      const isAuthCallback =
        (req.headers["x-forwarded-uri"] as string).split("?")[0] ===
        AUTH_ENDPOINT;
      if (isAuthCallback) {
        req.url = req.headers["x-forwarded-uri"] as string;
        return handleCallback(req, res, next);
      }

      if (req.headers["x-forwarded-proto"] !== "https") {
        logger.warn(
          "Your're using cookie authorization for insecure connection!"
        );
      }
      const code_verifier = generators.codeVerifier();
      const code_challenge = generators.codeChallenge(code_verifier);
      const random_state = getRandomString(24);
      getLoginCache().has(random_state)
        ? getLoginCache().del(random_state)
        : null;
      getLoginCache().set(random_state, {
        code_verifier,
        forwardedSchema: req.headers["x-forwarded-proto"],
        forwardedHost: req.headers["x-forwarded-host"],
        forwardedUri: req.headers["x-forwarded-uri"],
      });

      const authorizationUrl = getOidcClient().authorizationUrl({
        scope: "openid email profile",
        // resource: 'https://my.api.example.com/resource/32178',
        code_challenge,
        code_challenge_method: "S256",
        state: random_state,
      });

      res.redirect(authorizationUrl);
      return;
    } else {
      isProdEnv
        ? res.status(401).send()
        : res.status(401).render("401/index.ejs");
      return;
    }
  }
);

/**
 * Redirect URL. In this form it works only for standalone mode.
 */
app.get(
  AUTH_ENDPOINT,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    logger.debug(`Call to ${AUTH_ENDPOINT} from ${req.ip}`);
    return await handleCallback(req, res, next);
  }
);

/**
 * General error handling middleware. Mind that it should be used as the last
 * one.
 */
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err);
  isProdEnv ? res.status(500).send() : res.status(500).render("500/index.ejs");
};
app.use(errorHandler);

/**
 * Launch application running few tests before.
 */
try {
  validateDotenvFile();
  if (LOGIN_WHEN_NO_TOKEN) {
    if (isProdEnv) {
      logger.warn(`Log-in feature is not meant for ${PROD_ENV}!`);
    }
    initOidcClient()
      .then(() => {
        logger.info("OIDC Client has been initialized");
      })
      .catch((err) => {
        logger.error(err);
        process.exit(1);
      });
    initLoginCache();
  }
  if (VALIDATION_TYPE === "intro") {
    checkIfIntrospectionPossible()
      .then(() => {})
      .catch((err) => {
        logger.error(err);
        process.exit(1);
      });
  }

  app.listen(PORT, (): void => {
    logger.info(
      `Server Running here -> http://0.0.0.0:${PORT} in ${process.env.NODE_ENV} mode`
    );
  });
} catch (err) {
  logger.error(err);
  process.exit(1);
}
