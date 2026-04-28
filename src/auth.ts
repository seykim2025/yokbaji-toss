const AUTH_BASE =
  import.meta.env.VITE_AUTH_URL ||
  import.meta.env.VITE_API_URL ||
  "https://yokbaji-engine.vercel.app";

const SESSION_KEY = "yokbaji_toss_user_key";

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

export function getStoredUser(): TossUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as TossUser) : null;
  } catch {
    return null;
  }
}

function storeUser(user: TossUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function checkTossSession(): Promise<SessionResult> {
  const stored = getStoredUser();
  if (stored) return { ok: true, user: stored };
  return { ok: false, errorCode: "SESSION_INVALID" };
}

export async function loginWithToss(
  authorizationCode: string,
  referrer: string
): Promise<SessionResult> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/auth/toss-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizationCode, referrer }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.userKey !== "undefined") {
      const user: TossUser = { userKey: String(data.userKey), ...data };
      storeUser(user);
      return { ok: true, user };
    }
    const errorCode = (data.errorCode as AuthErrorCode) ?? "INTERNAL_ERROR";
    return { ok: false, errorCode };
  } catch {
    return { ok: false, errorCode: "INTERNAL_ERROR" };
  }
}
