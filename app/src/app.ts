import * as dotenv from "dotenv";
import express, { Application, Request, Response, NextFunction } from "express";
import session from "express-session";
import { BaseClient, generators } from "openid-client";
import NodeCache from "node-cache";

import { validateDotenvFile } from "./models/dotenvModel";
import { initOidcClient } from "./services/preAuth";
import { verifyTokenViaJwt } from "./services/auth";
import { logger } from "./services/logger";
import { getRandomString } from "./services/generators";

dotenv.config();
const PROD_ENV = "production";
const PORT = process.env.APP_PORT || 4181;
const LOGIN_WHEN_NO_TOKEN = ["true", "True", "1"].includes(
  process.env.LOGIN_WHEN_NO_TOKEN!
);
const COOKIE_NAME = process.env.COOKIE_NAME || "cx_forward_auth";

const loginCache = new NodeCache({ stdTTL: 10 * 60 });
let oidcClient: BaseClient;

const app: Application = express();
if (LOGIN_WHEN_NO_TOKEN) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "something-random",
      name: COOKIE_NAME,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: "auto",
        // domain: process.env.HOST_URI,
        maxAge: 10 * 60 * 1000,
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

const oauthFunc = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.debug(`Call to 'oauthFunc' from ${req.ip}`);
  const params = oidcClient.callbackParams(req);

  if (!params.state) {
    next(
      new Error("Missing 'state' parameter in authorization server response.")
    );
  }
  const cache = loginCache.get(params.state!) as any;
  if (!cache) {
    return next("Code has expired. Please login once again.");
  }

  const tokenSet = await oidcClient.callback(
    `${process.env.HOST_URI}/_oauth`,
    params,
    { code_verifier: cache.code_verifier, state: params.state }
  );

  // create login session
  req.session.regenerate((err) => {
    if (err) {
      next(err);
    }
    (req.session as any).access_token = tokenSet.access_token;
    req.session.save((err) => {
      if (err) {
        return next(err);
      }
      if (req.headers["x-forwarded-uri"]) {
        const originSchema = req.headers["x-forwarded-proto"];
        const originHost = req.headers["x-forwarded-host"];
        const originUri = req.headers["x-forwarded-uri"];
        const url = `${originSchema}://${originHost}${originUri}`;
        res.redirect(url);
      } else {
        return next(new Error("Missing `X-Forwarded-Uri` Header"));
      }
    });
  });
};

/**
 * Main endpoint for session-based authentication. If session check fails,
 * request is handled by the _other_ '/' endpoint
 */
app.get(
  "/",
  isSessionEstablished,
  (req: Request, res: Response, next: NextFunction): void => {
    logger.debug(`Call to '/' (session) from ${req.ip}`);
    if ((req.headers["x-forwarded-uri"] as string).includes("_oauth")) {
      const state = (req.headers["x-forwarded-uri"] as string)
        .replace("/_oauth" + "?", "")
        .split("&")
        .filter(
          (param) =>
            param.includes("state=") && !param.includes("session_state=")
        )[0]
        .replace("state=", "");
      const cache = loginCache.get(state) as any;
      if (!cache) {
        return next("Code has expired. Please login once again.");
      }
      if (!cache.forwardedUri) {
        return next(new Error("Missing `X-Forwarded-Uri` Header"));
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
    logger.debug(`Call to '/' from ${req.ip}`);
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization.split(" ");
      if (authHeader.length != 2) {
        res.status(401).render("401/index.ejs");
        return;
      } else if (authHeader[0] !== "Bearer" && authHeader[0] !== "bearer") {
        res.status(401).render("401/index.ejs");
        return;
      }
      try {
        const token = authHeader[1];
        await verifyTokenViaJwt(token);
      } catch (err) {
        logger.error(err);
        res.status(403).render("403/index.ejs");
        return;
      }
      res.sendStatus(200);
    } else if (LOGIN_WHEN_NO_TOKEN) {
      const isAuthCallback =
        (req.headers["x-forwarded-uri"] as string).split("?")[0] === "/_oauth";
      if (isAuthCallback) {
        req.url = req.headers["x-forwarded-uri"] as string;
        return oauthFunc(req, res, next);
      }

      if (req.headers["x-forwarded-proto"] !== "https") {
        logger.warn(
          "Your're using cookie authorization for insecure connection!"
        );
      }
      const code_verifier = generators.codeVerifier();
      const code_challenge = generators.codeChallenge(code_verifier);
      const random_state = getRandomString(24);
      loginCache.has(random_state) ? loginCache.del(random_state) : null;
      loginCache.set(random_state, {
        code_verifier,
        forwardedSchema: req.headers["x-forwarded-proto"],
        forwardedHost: req.headers["x-forwarded-host"],
        forwardedUri: req.headers["x-forwarded-uri"],
      });

      const authorizationUrl = oidcClient.authorizationUrl({
        scope: "openid email profile",
        // resource: 'https://my.api.example.com/resource/32178',
        code_challenge,
        code_challenge_method: "S256",
        state: random_state,
      });

      res.redirect(authorizationUrl);
      return;
    } else {
      res.status(401).render("401/index.ejs");
      return;
    }
  }
);

/**
 * Redirect URL. After successfull login, returned authentication code is
 * validated and if it passes a login session is created (shouldn't be use
 * on production).
 */
app.get(
  "/_oauth",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    logger.debug(`Call to '/_oauth' from ${req.ip}`);
    const params = oidcClient.callbackParams(req);
    const code_verifier = loginCache.get(req.ip) as string;
    if (!code_verifier) {
      return next("Code has expired. Please login once again.");
    }
    const tokenSet = await oidcClient.callback(
      `${process.env.HOST_URI}/_oauth`,
      params,
      { code_verifier }
    );

    // create login session
    req.session.regenerate((err) => {
      if (err) {
        next(err);
      }
      (req.session as any).access_token = tokenSet.access_token;
      req.session.save((err) => {
        if (err) {
          return next(err);
        }
        res.redirect("/");
      });
    });
  }
);

/**
 * Service info endpoint.
 */
app.get("/_oauth/info", (req: Request, res: Response): void => {
  const content = {
    service: process.env.APP_NAME || "cx-traefik-forward-auth",
    serviceVersion: process.env.APP_VERSION || "1.0.0",
    servicePort: PORT,
    hostUri: process.env.HOST_URI,
    OidcIssuerUrl: process.env.OIDC_ISSUER_URL,
    OidcClientId: process.env.OIDC_CLIENT_ID,
    OidcValidationType: process.env.OIDC_VALIDATION_TYPE,
    LoginWhenNoToken: LOGIN_WHEN_NO_TOKEN ? LOGIN_WHEN_NO_TOKEN : undefined,
    environment:
      process.env.NODE_ENV !== PROD_ENV ? process.env.NODE_ENV : undefined,
  };
  res.status(200).json(content);
});

/**
 * General error handling middleware. Mind that it should be used as the last.
 */
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err);
  res.status(500).render("500/index.ejs");
};
app.use(errorHandler);

/**
 * Launch application running few tests before.
 */
try {
  validateDotenvFile();
  if (LOGIN_WHEN_NO_TOKEN) {
    if (process.env.NODE_ENV === PROD_ENV) {
      logger.warn(`Log-in feature is not meant for ${PROD_ENV}!`);
    }
    initOidcClient()
      .then((client) => {
        oidcClient = client;
        logger.info("OIDC Client has been initialized");
      })
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
