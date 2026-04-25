const AUTH_BASE = "https://auth.oneclack.com";

export type AuthErrorCode =
  | "INVALID_APP"
  | "INVALID_REQUEST"
  | "TOKEN_EXCHANGE_FAILED"
  | "USER_FETCH_FAILED"
  | "DECRYPT_FAILED"
  | "SESSION_INVALID"
  | "INTERNAL_ERROR";

export interface TossUser {
  userKey: string;
  [key: string]: unknown;
}

export interface SessionCheckResult {
  ok: true;
  user: TossUser;
}

export interface SessionInvalidResult {
  ok: false;
  errorCode: AuthErrorCode;
}

export type SessionResult = SessionCheckResult | SessionInvalidResult;

export async function checkTossSession(): Promise<SessionResult> {
  const res = await fetch(`${AUTH_BASE}/api/toss/me`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data && !data.errorCode) {
    return { ok: true, user: data as TossUser };
  }
  return { ok: false, errorCode: (data.errorCode as AuthErrorCode) ?? "SESSION_INVALID" };
}

export async function loginWithToss(
  authorizationCode: string,
  referrer: string
): Promise<SessionResult> {
  const res = await fetch(`${AUTH_BASE}/api/toss/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ appSlug: "yokbaji", authorizationCode, referrer }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data && !data.errorCode) {
    return { ok: true, user: data as TossUser };
  }
  return { ok: false, errorCode: (data.errorCode as AuthErrorCode) ?? "INTERNAL_ERROR" };
}
