const AUTH_BASE =
  import.meta.env.VITE_AUTH_URL || "https://auth.oneclack.com";

export type AuthErrorCode =
  | "INVALID_APP"
  | "INVALID_REQUEST"
  | "TOKEN_EXCHANGE_FAILED"
  | "USER_FETCH_FAILED"
  | "DECRYPT_FAILED"
  | "SESSION_INVALID"
  | "INTERNAL_ERROR"
  | "LOGIN_UNAVAILABLE";

export interface TossUser {
  userKey: string;
  name?: string;
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

// auth.oneclack.com response shape: { ok: boolean, error?: { code, message }, ...user }
function parseAuthResponse(status: number, data: Record<string, unknown>): SessionResult {
  if (status >= 200 && status < 300 && data.ok === true) {
    const user: TossUser = {
      userKey: String(data.userKey ?? ""),
      ...(data.name ? { name: data.name as string } : {}),
    };
    return { ok: true, user };
  }
  const errCode =
    (data.error as { code?: string } | undefined)?.code as AuthErrorCode | undefined;
  return { ok: false, errorCode: errCode ?? "INTERNAL_ERROR" };
}

export async function checkTossSession(): Promise<SessionResult> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/toss/me`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    return parseAuthResponse(res.status, data);
  } catch {
    return { ok: false, errorCode: "SESSION_INVALID" };
  }
}

export async function loginWithToss(
  authorizationCode: string,
  referrer: string
): Promise<SessionResult> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/toss/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ appSlug: "yokbaji", authorizationCode, referrer }),
    });
    const data = await res.json().catch(() => ({}));
    return parseAuthResponse(res.status, data);
  } catch {
    return { ok: false, errorCode: "INTERNAL_ERROR" };
  }
}
