// AUTH_BASE is empty by default so /api/toss/* is relative — Vite proxy forwards to auth.oneclack.com.
// Set VITE_AUTH_URL to an absolute URL to override (e.g. production deploy without proxy).
const AUTH_BASE = import.meta.env.VITE_AUTH_URL ?? "";

const USER_STORAGE_KEY = "yokbaji_session_user";

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
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code") || urlParams.get("authorizationCode");
    const referrer = urlParams.get("referrer") || "APP";

    if (code) {
      // Consume the code from URL to prevent reuse on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      const result = await loginWithToss(code, referrer);
      if (result.ok) return result;
    }

    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return { ok: false, errorCode: "SESSION_INVALID" };
    const user = JSON.parse(stored) as TossUser;
    if (!user?.userKey) return { ok: false, errorCode: "SESSION_INVALID" };
    return { ok: true, user };
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
      body: JSON.stringify({ appSlug: "yokbaji", authorizationCode, referrer }),
    });
    const data = await res.json().catch(() => ({}));
    const result = parseAuthResponse(res.status, data);
    if (result.ok) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      return result;
    }
    // Sandbox fallback: when the server can't exchange the sandbox code (e.g. mTLS/API mismatch),
    // use a mock session so the full UI flow can be tested.
    if (referrer === "SANDBOX" && result.errorCode === "TOKEN_EXCHANGE_FAILED") {
      const sandboxUser: TossUser = {
        userKey: `sandbox-${authorizationCode.slice(0, 12)}`,
        name: "샌드박스 유저",
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sandboxUser));
      return { ok: true, user: sandboxUser };
    }
    return result;
  } catch {
    return { ok: false, errorCode: "INTERNAL_ERROR" };
  }
}

export function clearTossSession(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}
