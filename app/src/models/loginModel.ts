import session from "express-session";

export interface LoginSession extends Partial<session.SessionData> {
  token?: string;
}

export interface LoginCache extends Partial<session.SessionData> {
  code_verifier?: string;
  nonce?: string;
  forwardedSchema: string;
  forwardedHost: string;
  forwardedUri: string;
}
