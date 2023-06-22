import { ActiveOidcToken, InactiveOidcToken } from "../models/authModel";
import { logger } from "./logger";

/**
 * Verifies token payload (authorizes caller). For the time being it's
 * open-to-implementation feature.
 *
 * @param payload
 * @throws Error if token is inactive
 * @throws Error if authorization group is missing in token payload
 */
export function validateTokenPayload<
  T extends ActiveOidcToken,
  R extends InactiveOidcToken
>(payload: Partial<T> | R): void {
  if (payload.active !== undefined && !payload.active) {
    throw new Error("Token is inactive.");
  }

  const authGroupName = process.env.AUTH_ROLE_NAME;
  if (authGroupName) {
    const groupStruct = process.env.AUTH_ROLES_STRUCT?.split(
      "."
    ) as Array<string>;

    const groupsAssigned = groupStruct.reduce((acc, field) => {
      return acc[field];
      /* eslint-disable  @typescript-eslint/no-explicit-any */
    }, payload as any) as Array<string>;

    if (!groupsAssigned.includes(authGroupName)) {
      logger.debug(
        `Missing demanded authorization group ${authGroupName} in token payload.`
      );
      throw new Error(`Missing access rights.`);
    }
  }
}
