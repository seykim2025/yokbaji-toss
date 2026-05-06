import { REWARDED_AD_COIN_AMOUNT } from "../config/ad.config";
import { canWatchRewardedAd } from "../services/reward-ad.service";
import RewardedCoinButton from "./RewardedCoinButton";

interface Props {
  open: boolean;
  onClose: () => void;
  onCoinsAdded: (amount: number) => void;
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "flex-end",
  zIndex: 200,
};

const sheet: React.CSSProperties = {
  background: "#fff",
  borderRadius: "20px 20px 0 0",
  padding: "28px 24px 40px",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export default function CoinShortageModal({ open, onClose, onCoinsAdded }: Props) {
  if (!open) return null;

  const { allowed, reason: limitReason } = canWatchRewardedAd();

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>코인이 부족해요</p>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
          광고를 끝까지 보면 코인 {REWARDED_AD_COIN_AMOUNT}개를 드려요
        </p>

        {allowed ? (
          <RewardedCoinButton
            onCoinsAdded={(amount) => {
              onCoinsAdded(amount);
              onClose();
            }}
          />
        ) : (
          <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>{limitReason}</p>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 4,
            background: "none",
            border: "none",
            color: "#6b7280",
            fontSize: 14,
            cursor: "pointer",
            padding: "8px 0",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
