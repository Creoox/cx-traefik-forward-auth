import winston from "winston";

const PROD_ENV = "production";

const { combine, timestamp, label, printf } = winston.format;
const cxFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} ${label}: [${level.toUpperCase()}] ${message}`;
});

const transports = {
  console: new winston.transports.Console({
    level: "debug",
    handleExceptions: true,
  }),
  file: new winston.transports.File({
    level: "warn",
    filename: "/app/logs/error.log",
    maxsize: 5 * 1024 * 1024, // 5Mb
    maxFiles: 10,
  }),
};

/**
 * Application logger.
 */
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === PROD_ENV ? "warn" : "debug",
  format: combine(
    label({ label: process.env.APP_NAME || "cx-traefik-forward-auth" }),
    timestamp(),
    cxFormat
  ),
  transports: [
    process.env.NODE_ENV === PROD_ENV ? transports.file : transports.console,
  ],
  exitOnError: false,
});
