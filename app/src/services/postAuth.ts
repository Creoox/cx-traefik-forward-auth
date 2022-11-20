import { ActiveOidcToken, InactiveOidcToken } from "../models/authModel";
import { logger } from "./logger";

/**
 * Verifies token payload (authorizes caller). For the time being it's
 * open-to-implementation feature.
 *
 * @param payload
 * @throws Error if token is inactive
 * @todo case-based implementation.
 */
export function validateTokenPayload<
  T extends ActiveOidcToken,
  R extends InactiveOidcToken
>(payload: Partial<T> | R): void {
  if (payload.active !== undefined && !payload.active) {
    throw new Error("Token is inactive.");
  }
  logger.debug(
    payload.active !== undefined && payload.active
      ? "token active"
      : "token valid"
  );
}
