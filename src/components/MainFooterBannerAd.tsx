import { useEffect, useRef, useState } from "react";
import { BANNER_AD_GROUP_ID } from "../config/ad.config";
import { attachBannerAd, initAds } from "../lib/tossAds";
import { isTossWebView } from "../toss";

export default function MainFooterBannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adVisible, setAdVisible] = useState(false);
  const destroyRef = useRef<(() => void) | null>(null);
  const inWebView = isTossWebView();

  useEffect(() => {
    if (!inWebView) return;

    let cancelled = false;

    (async () => {
      await initAds();
      if (cancelled || !containerRef.current) return;

      const destroy = await attachBannerAd(
        BANNER_AD_GROUP_ID,
        containerRef.current,
        {
          onRendered: () => { if (!cancelled) setAdVisible(true); },
          onFailed: () => { if (!cancelled) setAdVisible(false); },
          onNoFill: () => { if (!cancelled) setAdVisible(false); },
        }
      );
      if (destroy) destroyRef.current = destroy;
    })();

    return () => {
      cancelled = true;
      destroyRef.current?.();
      destroyRef.current = null;
      setAdVisible(false);
    };
  }, [inWebView]);

  // In Toss WebView: always reserve 60px minimum so layout stays stable
  if (inWebView) {
    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          minHeight: adVisible ? 96 : 60,
          overflow: "hidden",
          transition: "min-height 0.2s",
        }}
      />
    );
  }

  // Outside WebView (browser dev / non-Toss env): placeholder
  return (
    <div style={{
      width: "100%",
      height: 60,
      background: "#f3f4f6",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <span style={{ fontSize: 11, color: "#9ca3af" }}>광고 영역</span>
    </div>
  );
}
