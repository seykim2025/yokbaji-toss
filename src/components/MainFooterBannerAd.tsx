import { useEffect, useRef, useState } from "react";
import { BANNER_AD_GROUP_ID } from "../config/ad.config";
import { attachBannerAd, initAds } from "../lib/tossAds";

interface Props {
  hidden?: boolean;
}

export default function MainFooterBannerAd({ hidden }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const destroyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (hidden) return;

    let cancelled = false;

    (async () => {
      await initAds();
      if (cancelled || !containerRef.current) return;

      const destroy = await attachBannerAd(
        BANNER_AD_GROUP_ID,
        containerRef.current,
        {
          onRendered: () => { if (!cancelled) setVisible(true); },
          onFailed: () => { if (!cancelled) setVisible(false); },
          onNoFill: () => { if (!cancelled) setVisible(false); },
        }
      );
      if (destroy) destroyRef.current = destroy;
    })();

    return () => {
      cancelled = true;
      destroyRef.current?.();
      destroyRef.current = null;
      setVisible(false);
    };
  }, [hidden]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        minHeight: visible ? 96 : 0,
        overflow: "hidden",
        transition: "min-height 0.2s",
      }}
    />
  );
}
