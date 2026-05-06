import RewardedCoinButton from "./RewardedCoinButton";
import styles from "./TokenPage.module.css";

interface Props {
  onBack: () => void;
  onCoinsAdded?: (amount: number) => void;
}

export default function TokenPage({ onBack, onCoinsAdded }: Props) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <h2 className={styles.title}>코인 충전</h2>
        <div className={styles.spacer} />
      </header>
      <div className={styles.body}>
        <span className={styles.icon}>🪙</span>
        <p className={styles.message}>광고를 보고 코인을 받아보세요</p>

        <div style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
          <RewardedCoinButton
            label="광고 보고 코인 받기"
            onCoinsAdded={(amount) => onCoinsAdded?.(amount)}
          />
        </div>

        <p className={styles.sub}>결제 충전은 준비 중이에요.</p>
      </div>
    </div>
  );
}
