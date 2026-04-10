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
    // Prefer getAnonymousKey (SDK 2.4.5+), fall back to getUserKeyForGame
    const fn = sdk.getAnonymousKey ?? sdk.getUserKeyForGame;
    if (fn) {
      const result = await fn();
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
    key = `local-${crypto.randomUUID()}`;
    localStorage.setItem(LOCAL_KEY, key);
  }
  _cachedUserKey = key;
  return key;
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
export async function haptic(
  type: "tickWeak" | "tap" | "tickMedium" | "success" | "error" = "tap"
): Promise<void> {
  try {
    const sdk = await loadBridge();
    await sdk.generateHapticFeedback({ type });
  } catch {
    // Not in Toss WebView – ignore
  }
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
