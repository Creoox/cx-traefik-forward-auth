import * as dotenv from "dotenv";
import express, { Application, Request, Response, NextFunction } from "express";
import session from "express-session";

import {
  AUTH_ALLOW_UNSEC_OPTIONS,
  VERIF_TYPE,
  LOGIN_WHEN_NO_TOKEN,
  LOGIN_COOKIE_NAME,
  JWT_TOKEN_TYPE,
  validateDotenvFile,
} from "./models/dotenvModel";
import { checkIfIntrospectionPossible } from "./services/preAuth";
import {
  genAuthorizationUrl,
  handleCallback,
  verifyTokenViaJwt,
  verifyTokenViaIntrospection,
} from "./services/auth";
import { validateTokenPayload } from "./services/postAuth";
import { AUTH_ENDPOINT, initOidcClient } from "./states/clients";
import { initLoginCache, getLoginCache } from "./states/cache";
import { logger } from "./services/logger";
import { getStateParam, getEnvInfo } from "./services/helpers";
import type { LoginSession, LoginCache } from "./models/loginModel";

dotenv.config();
const PROD_ENV = "production";
const isProdEnv = process.env.NODE_ENV === PROD_ENV;
const PORT = process.env.APP_PORT || 4181;

const app: Application = express();
/**
 * Setup authorization session cookie (should be used only on DEV!)
 */
if (LOGIN_WHEN_NO_TOKEN) {
  app.use(
    session({
      secret: process.env.LOGIN_SESSION_SECRET || "cyHkxMY0tWDNrxnutdfaNngk",
      name: LOGIN_COOKIE_NAME,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: "auto",
        maxAge: 15 * 60 * 1000,
      },
    })
  );
}
/**
 * Middleware to filter and handle browsers OPTIONS preflight request.
 * TODO: Restrict preflight for defined origins (clients) only.
 */
if (AUTH_ALLOW_UNSEC_OPTIONS) {
  app.use(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (req.headers["x-forwarded-method"] === "OPTIONS") {
        logger.debug(
          `Detected OPTIONS request from ${req.url} - passing through!`
        );
        res.sendStatus(200);
        return;
      } else {
        next();
      }
    }
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
  if (LOGIN_WHEN_NO_TOKEN && !!(req.session as LoginSession).token) {
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
    logger.debug(`Call (session) to '/' from ${req.url}`);

    // /AUTH_ENDPOINT/token endpoint
    if (
      !!req.headers["x-forwarded-uri"] &&
      (req.headers["x-forwarded-uri"] as string).includes(
        `${AUTH_ENDPOINT}/token`
      )
    ) {
      res.status(400).render("token/index.ejs", {
        token_type: JWT_TOKEN_TYPE,
        token: (req.session as LoginSession).token,
      });
      return;
    }
    // /AUTH_ENDPOINT/info endpoint
    else if (
      !!req.headers["x-forwarded-uri"] &&
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

      const cache = getLoginCache().get(state) as LoginCache;
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
          VERIF_TYPE === "intro"
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
        !!req.headers["x-forwarded-uri"] &&
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
      res.redirect(genAuthorizationUrl(req.headers));
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
const errorHandler = (err: Error, req: Request, res: Response) => {
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
  if (VERIF_TYPE === "intro") {
    checkIfIntrospectionPossible()
      .then()
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
