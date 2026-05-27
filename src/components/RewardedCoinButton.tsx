import { useState } from "react";
import { REWARDED_AD_GROUP_ID } from "../config/ad.config";
import { loadRewardedAd, showRewardedAd } from "../lib/tossAds";
import { canWatchRewardedAd, grantReward } from "../services/reward-ad.service";

interface Props {
  onCoinsAdded: (amount: number) => void;
  label?: string;
}

type State = "idle" | "loading" | "ready" | "showing" | "done" | "error";

export default function RewardedCoinButton({ onCoinsAdded, label = "광고 보고 10코인 받기" }: Props) {
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");

  const { allowed, reason: limitReason } = canWatchRewardedAd();

  async function handleClick() {
    if (!allowed) {
      setMsg(limitReason ?? "오늘 보상 한도를 모두 사용했어요.");
      return;
    }

    setState("loading");
    setMsg("");

    let loaded = false;
    console.log("[reward-ad] ad started");

    const unregisterLoad = await loadRewardedAd(
      REWARDED_AD_GROUP_ID,
      () => {
        // onEvent only fires with type: 'loaded'
        loaded = true;
        setState("ready");
        showAd();
      },
      (err) => {
        console.error("[RewardedAd] load error:", err);
        setState("error");
        setMsg("광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    );

    async function showAd() {
      if (!loaded) return;
      setState("showing");
      unregisterLoad?.();

      const eventId = `reward_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      await showRewardedAd(
        REWARDED_AD_GROUP_ID,
        async () => {
          // userEarnedReward — grant coin
          console.log("[reward-ad] ad completed");
          const result = await grantReward(eventId);
          if (result.ok) {
            console.log(`[reward-ad] reward amount = ${result.coinsAdded}`);
            setState("done");
            setMsg(`코인 ${result.coinsAdded}개가 지급됐어요!`);
            onCoinsAdded(result.coinsAdded);
          } else {
            setState("error");
            setMsg(
              result.reason === "daily_limit"
                ? "오늘 받을 수 있는 광고 보상 코인을 모두 받았어요."
                : "이미 지급된 광고예요."
            );
          }
        },
        () => {
          // dismissed without reward
          setState("idle");
          setMsg("광고 시청이 완료되지 않아 코인이 지급되지 않았어요.");
        },
        (err) => {
          console.error("[RewardedAd] show error:", err);
          setState("error");
          setMsg("광고를 표시하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      );
    }
  }

  const busy = state === "loading" || state === "showing";
  const btnLabel =
    state === "loading" ? "광고 불러오는 중..." :
    state === "showing" ? "광고 시청 중..." :
    state === "done" ? "코인 지급 완료!" :
    label;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        onClick={handleClick}
        disabled={busy || state === "done" || !allowed}
        style={{
          background: busy || !allowed ? "#e5e7eb" : "#3182f6",
          color: busy || !allowed ? "#9ca3af" : "#fff",
          border: "none",
          borderRadius: 12,
          padding: "14px 0",
          fontSize: 15,
          fontWeight: 600,
          cursor: busy || state === "done" || !allowed ? "default" : "pointer",
          width: "100%",
        }}
      >
        {btnLabel}
      </button>
      {msg && (
        <p style={{ fontSize: 12, color: state === "done" ? "#22c55e" : "#ef4444", margin: 0 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
