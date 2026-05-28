import { API_BASE } from "./api";

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

function parseAuthResponse(status: number, data: Record<string, unknown>, logs: string[]): SessionResult {
  logs.push(`parseAuthResponse raw keys: ${Object.keys(data).join(", ")}`);
  logs.push(`parseAuthResponse raw body snippet: ${JSON.stringify(data).substring(0, 100)}...`);
  
  if (status >= 200 && status < 300 && data.ok === true) {
    // Try multiple possible locations for the user key
    const rawKey = data.userKey || data.user_key || data.id || (data.user as any)?.userKey || (data.user as any)?.id;
    
    if (!rawKey) {
      logs.push(`parseAuthResponse error: data.ok is true but no valid user identifier found in payload`);
      return { ok: false, errorCode: "USER_FETCH_FAILED" };
    }
    
    logs.push(`parseAuthResponse found valid key candidate: ${String(rawKey).substring(0, 3)}***`);
    const user: TossUser = {
      userKey: String(rawKey),
      ...(data.name ? { name: data.name as string } : {}),
    };
    return { ok: true, user };
  }
  const errCode =
    (data.error as { code?: string } | undefined)?.code as AuthErrorCode | undefined;
  return { ok: false, errorCode: errCode ?? "INTERNAL_ERROR" };
}

export async function checkTossSession(): Promise<SessionResult & { logs: string[] }> {
  const logs: string[] = [];
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code") || urlParams.get("authorizationCode");
    const referrer = urlParams.get("referrer") || "APP";

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const result = await loginWithToss(code, referrer);
      if (result.ok) {
        logs.push(`checkTossSession: loginWithToss succeeded via URL code`);
        return { ...result, logs: [...logs, ...(result.logs || [])] };
      }
    }

    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) {
      logs.push(`checkTossSession failure: no stored session`);
      return { ok: false, errorCode: "SESSION_INVALID", logs };
    }
    
    logs.push(`stored session raw: ${stored.substring(0, 50)}...`);
    const user = JSON.parse(stored) as TossUser;
    
    if (!user || !user.userKey) {
      logs.push(`checkTossSession failure: missing userKey in stored session`);
      // If invalid, clear it
      localStorage.removeItem(USER_STORAGE_KEY);
      return { ok: false, errorCode: "SESSION_INVALID", logs };
    }
    
    logs.push(`stored session parsed userKey exists: true`);
    logs.push(`stored session parsed userKey masked: ${String(user.userKey).substring(0, 3)}***`);
    
    return { ok: true, user, logs };
  } catch (e) {
    logs.push(`checkTossSession exception: ${String(e)}`);
    return { ok: false, errorCode: "SESSION_INVALID", logs };
  }
}

export async function loginWithToss(
  authorizationCode: string,
  referrer: string
): Promise<SessionResult & { logs: string[] }> {
  const logs: string[] = [];
  logs.push(`loginWithToss called, code=${authorizationCode.substring(0, 5)}..., referrer=${referrer}`);
  
  try {
    const res = await fetch(`${API_BASE}/api/auth/toss-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appSlug: "yokbaji", authorizationCode, referrer }),
    });
    const data = await res.json().catch(() => ({}));
    logs.push(`loginWithToss response status: ${res.status}, data.ok: ${data.ok}`);
    
    const result = parseAuthResponse(res.status, data, logs);
    
    if (result.ok) {
      logs.push(`loginWithToss parse success`);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      const afterStore = localStorage.getItem(USER_STORAGE_KEY) || "";
      logs.push(`stored session after login raw: ${afterStore.substring(0, 50)}...`);
      return { ...result, logs };
    }
    
    logs.push(`loginWithToss parse failed: ${result.errorCode}`);

    // Sandbox fallback: trigger on ANY auth error if in sandbox
    if (referrer === "SANDBOX") {
      logs.push(`Sandbox fallback triggered due to error: ${result.errorCode}`);
      const sandboxUser: TossUser = {
        userKey: `sandbox-${authorizationCode.slice(0, 12)}`,
        name: "샌드박스 유저",
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sandboxUser));
      const afterStore = localStorage.getItem(USER_STORAGE_KEY) || "";
      logs.push(`stored session after sandbox fallback raw: ${afterStore.substring(0, 50)}...`);
      return { ok: true, user: sandboxUser, logs };
    }
    
    return { ...result, logs };
  } catch (e) {
    logs.push(`loginWithToss exception: ${String(e)}`);
    if (referrer === "SANDBOX") {
      logs.push(`Sandbox fallback triggered due to exception`);
      const sandboxUser: TossUser = {
        userKey: `sandbox-${authorizationCode.slice(0, 12)}`,
        name: "샌드박스 유저",
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sandboxUser));
      return { ok: true, user: sandboxUser, logs };
    }
    return { ok: false, errorCode: "INTERNAL_ERROR", logs };
  }
}

export function clearTossSession(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}
