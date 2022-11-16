import * as dotenv from "dotenv";
import express, { Application, Request, Response, NextFunction } from "express";
import session from "express-session";
import { BaseClient, generators } from "openid-client";
import NodeCache from "node-cache";

import { validateDotenvFile } from "./models/dotenvModel";
import { getJwkKeys, initOidcClient } from "./services/preAuth";
import { verifyTokenViaJwt } from "./services/auth";

dotenv.config();
const DEV_ENV = "development";
const PROD_ENV = "production";
const PORT = process.env.APP_PORT || 4181;
const LOGIN_WHEN_NO_TOKEN = ["true", "True", "1"].includes(
  process.env.LOGIN_WHEN_NO_TOKEN!
);
const COOKIE_NAME = process.env.COOKIE_NAME || "cx_forward_auth";

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

const loginCache = new NodeCache({ stdTTL: 10 * 60 });
let oidcClient: BaseClient;

// middleware to test if authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (LOGIN_WHEN_NO_TOKEN && !!(req.session as any).access_token) {
    next();
  } else {
    next("route");
  }
};

app.get(
  "/",
  isAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    console.log("/ (isAuthenticated)");
    const content = await getJwkKeys();
    res.status(200).json(content).end();

    // req.method = req.headers["X-Forwarded-Method"] as string;
    // req.hostname = req.headers["X-Forwarded-Host"] as string;
    // if (req.headers["X-Forwarded-Uri"]) {
    //   req.url = String(new URL(req.headers["X-Forwarded-Uri"] as string));
    // }
  }
);

app.get("/", async (req: Request, res: Response): Promise<void> => {
  console.log("/");
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

      const content = await getJwkKeys();
      res.status(200).json(content);

      // req.method = req.headers["X-Forwarded-Method"] as string;
      // req.hostname = req.headers["X-Forwarded-Host"] as string;
      // if (req.headers["X-Forwarded-Uri"]) {
      //   req.url = String(new URL(req.headers["X-Forwarded-Uri"] as string));
      // }
    } catch (err) {
      console.error(err);
      res.status(403).render("403/index.ejs");
      return;
    }
  } else if (LOGIN_WHEN_NO_TOKEN) {
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);
    loginCache.has(req.ip) ? loginCache.del(req.ip) : null;
    loginCache.set(req.ip, code_verifier);

    const authorizationUrl = oidcClient.authorizationUrl({
      scope: "openid email profile",
      // resource: 'https://my.api.example.com/resource/32178',
      code_challenge,
      code_challenge_method: "S256",
    });

    res.redirect(authorizationUrl);
    return;
  } else {
    res.status(401).render("401/index.ejs");
    return;
  }
});

app.get(
  "/_oauth",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("_oauth");
    const params = oidcClient.callbackParams(req);
    const code_verifier = loginCache.get(req.ip) as string;
    if (!code_verifier) {
      return next("Couldn't get code_verifier from the cache.");
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

app.get("/_oauth-info", (req: Request, res: Response): void => {
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

try {
  validateDotenvFile();
  if (LOGIN_WHEN_NO_TOKEN) {
    if (process.env.NODE_ENV === PROD_ENV) {
      console.warn(`[WARNING] Log-in feature is not meant for ${PROD_ENV}`);
    }
    initOidcClient()
      .then((client) => {
        oidcClient = client;
        console.log(`[INFO] OIDC Client has been initialized`);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }

  app.listen(PORT, (): void => {
    console.log(`[INFO] Server Running here 👉 http://localhost:${PORT}`);
  });
} catch (err) {
  console.error(err);
  // process.kill(process.pid, "SIGTERM");
  process.exit(1);
}
