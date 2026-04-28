/**
 * Toss Apps-in-Toss SDK bridge helpers.
 *
 * All functions gracefully degrade when running outside the Toss WebView
 * (e.g. in a desktop browser during development).
 *
 * We use dynamic imports so the native bridge only loads inside the WebView.
 */

let _cachedUserKey: string | null = null;

async function loadBridge() {
  return await import("@apps-in-toss/web-framework");
}

/**
 * Returns a stable per-user hash from the Toss app.
 * Falls back to a localStorage-based UUID when running outside the WebView.
 */
export async function getTossUserKey(): Promise<string> {
  if (_cachedUserKey) return _cachedUserKey;

  try {
    const sdk = await loadBridge();
    if (sdk.getAnonymousKey) {
      const result = await sdk.getAnonymousKey();
      // SDK contract: { type: 'HASH', hash } on success, 'ERROR' string on
      // unknown failure, undefined when the host Toss app is too old.
      if (result && typeof result === "object" && result.type === "HASH") {
        _cachedUserKey = result.hash;
        return result.hash;
      }
    }
  } catch {
    // Not in Toss WebView – fall through to local fallback
  }

  // Fallback: localStorage-based anonymous key for dev / standalone
  const LOCAL_KEY = "yokbaji_anon_user_key";
  let key = localStorage.getItem(LOCAL_KEY);
  if (!key) {
    key = `local-${generateUuid()}`;
    localStorage.setItem(LOCAL_KEY, key);
  }
  _cachedUserKey = key;
  return key;
}

// iOS <15.4 WebView / older browsers lack crypto.randomUUID. Use it when
// available, otherwise fall back to crypto.getRandomValues (widely shipped
// back to iOS 11) and finally Math.random so sandbox dev never crashes.
function generateUuid(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // RFC 4122 v4 layout
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

/** Returns true when the app is running inside the Toss WebView. */
export function isTossWebView(): boolean {
  try {
    return typeof window !== "undefined" && "__GRANITE_NATIVE_EMITTER" in window;
  } catch {
    return false;
  }
}

/** Close the mini-app (Toss WebView only; no-op otherwise). */
export async function closeTossView(): Promise<void> {
  try {
    const sdk = await loadBridge();
    await sdk.closeView();
  } catch {
    // Not in Toss WebView – ignore
  }
}

/** Keep the screen awake while the game is active. */
export async function setScreenAwake(enabled: boolean): Promise<void> {
  try {
    const sdk = await loadBridge();
    await sdk.setScreenAwakeMode({ enabled });
  } catch {
    // Not in Toss WebView – ignore
  }
}

/** Trigger a haptic feedback vibration. */
export type HapticType =
  | "tickWeak"
  | "tap"
  | "tickMedium"
  | "softMedium"
  | "basicWeak"
  | "basicMedium"
  | "success"
  | "error"
  | "wiggle"
  | "confetti";

export async function haptic(type: HapticType = "tap"): Promise<void> {
  try {
    const sdk = await loadBridge();
    await sdk.generateHapticFeedback({ type });
  } catch {
    // Not in Toss WebView – ignore
  }
}

/**
 * Initiate Toss OAuth login. Returns { authorizationCode, referrer } on success.
 * Returns null when called outside the Toss WebView (dev browser, etc.).
 */
export async function tossAppLogin(): Promise<{ authorizationCode: string; referrer: string } | null> {
  try {
    const sdk = await loadBridge();
    if (sdk.appLogin) {
      return await sdk.appLogin();
    }
  } catch {
    // Not in Toss WebView or login was cancelled
  }
  return null;
}

/** Share text via the native share sheet. */
export async function shareMessage(message: string): Promise<void> {
  try {
    const sdk = await loadBridge();
    await sdk.share({ message });
  } catch {
    // Fallback: use Web Share API if available
    if (navigator.share) {
      await navigator.share({ text: message });
    }
  }
}
