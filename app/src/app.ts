import * as dotenv from "dotenv";
import express, { Request, Response, Application } from "express";

import { validateDotenvFile } from "./models/dotenvModel";

dotenv.config();
const DEV_ENV = "development";
const PROD_ENV = "production";
const PORT = process.env.APP_PORT || 4181;

const app: Application = express();
app.use(express.json());
// app.use(express.static("public"));

let appHealth: boolean;

app.get("/", (req: Request, res: Response): void => {
  res.send("Hello World!");
});

app.get("/health", (req: Request, res: Response): void => {
  appHealth ? res.send("OK") : res.send("Not OK");
});

app.get("/info", (req: Request, res: Response): void => {
  const content = {
    service: process.env.APP_NAME || "cx-traefik-forward-auth",
    serviceVersion: process.env.APP_VERSION || "1.0.0",
    environment:
      process.env.NODE_ENV !== PROD_ENV ? process.env.NODE_ENV : undefined,
  };
  res.status(200).json(content);
});


try {
  validateDotenvFile();
  app.listen(PORT, (): void => {
    console.log(`Server Running here 👉 http://localhost:${PORT}`);
  });
} catch (err) {
  console.error(err);
  // process.kill(process.pid, "SIGTERM");
  process.exit(1);
}
