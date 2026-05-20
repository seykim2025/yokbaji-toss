/**
 * Wrapper around @apps-in-toss/web-framework ad APIs.
 * Degrades gracefully outside the Toss WebView.
 */

let _initialized = false;

async function getAdSdk() {
  return await import("@apps-in-toss/web-framework");
}

export async function initAds(): Promise<void> {
  if (_initialized) return;
  try {
    const sdk = await getAdSdk();
    if (!sdk.TossAds?.initialize?.isSupported?.()) return;
    await new Promise<void>((resolve) => {
      sdk.TossAds.initialize({
        callbacks: {
          onInitialized: () => resolve(),
          onInitializationFailed: () => resolve(),
        },
      });
    });
    _initialized = true;
  } catch {
    // Outside WebView — ignore
  }
}

export async function attachBannerAd(
  adGroupId: string,
  target: string | HTMLElement,
  callbacks?: {
    onRendered?: () => void;
    onFailed?: () => void;
    onNoFill?: () => void;
  }
): Promise<(() => void) | null> {
  try {
    const sdk = await getAdSdk();
    if (!sdk.TossAds?.attachBanner?.isSupported?.()) return null;
    const result = sdk.TossAds.attachBanner(adGroupId, target, {
      theme: "auto",
      tone: "blackAndWhite",
      variant: "expanded",
      callbacks: {
        onAdRendered: callbacks?.onRendered,
        onAdFailedToRender: callbacks?.onFailed,
        onNoFill: callbacks?.onNoFill,
      },
    });
    return result.destroy;
  } catch {
    return null;
  }
}

export async function loadRewardedAd(
  adGroupId: string,
  onEvent: (type: string) => void,
  onError: (err: unknown) => void
): Promise<(() => void) | null> {
  try {
    const sdk = await getAdSdk();
    if (!sdk.loadFullScreenAd?.isSupported?.()) {
      onError(new Error("loadRewardedAd: not supported in this Toss app version"));
      return null;
    }
    const unregister = sdk.loadFullScreenAd({
      options: { adGroupId },
      onEvent: (e) => onEvent(e.type),
      onError,
    });
    return unregister;
  } catch {
    onError(new Error("loadRewardedAd: not in Toss WebView"));
    return null;
  }
}

export async function showRewardedAd(
  adGroupId: string,
  onEarnedReward: () => void,
  onDismissedWithoutReward: () => void,
  onError: (err: unknown) => void
): Promise<(() => void) | null> {
  try {
    const sdk = await getAdSdk();
    if (!sdk.showFullScreenAd?.isSupported?.()) {
      onError(new Error("showRewardedAd: not supported"));
      return null;
    }
    const cleanup = sdk.showFullScreenAd({
      options: { adGroupId },
      onEvent: (e) => {
        if (e.type === "userEarnedReward") {
          onEarnedReward();
        } else if (e.type === "dismissed") {
          onDismissedWithoutReward();
        }
      },
      onError,
    });
    return cleanup;
  } catch (err) {
    onError(err);
    return null;
  }
}

export function isAdsSupported(): boolean {
  try {
    // TossAds is synchronously available after initialization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(window as any).__GRANITE_NATIVE_EMITTER;
  } catch {
    return false;
  }
}
