import { useState } from "react";
import RewardedCoinButton from "./RewardedCoinButton";
import styles from "./TokenPage.module.css";

interface Props {
  onBack: () => void;
  onCoinsAdded?: (amount: number) => void;
}

export default function TokenPage({ onBack, onCoinsAdded }: Props) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [addedAmount, setAddedAmount] = useState(0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.backBtn} style={{ visibility: "hidden", pointerEvents: "none" }} />
        <h2 className={styles.title}>코인 충전</h2>
        <div className={styles.spacer} />
      </header>
      <div className={styles.body}>
        <span className={styles.icon}>🪙</span>
        <p className={styles.message}>광고를 보고 10코인을 받아보세요</p>

        <div style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
          <RewardedCoinButton
            label="광고 보고 10코인 받기"
            onCoinsAdded={(amount) => {
              onCoinsAdded?.(amount);
              setAddedAmount(amount);
              setShowSuccess(true);
            }}
          />
        </div>
      </div>

      {showSuccess && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "28px 24px 20px", width: "min(300px, 88vw)", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 18, fontWeight: 700, color: "#191f28", marginBottom: 12 }}>충전 완료!</p>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.5 }}>
              {addedAmount}코인이 충전되었습니다.
            </p>
            <button
              style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: "#3182f6", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer" }}
              onClick={() => {
                setShowSuccess(false);
                onBack();
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
