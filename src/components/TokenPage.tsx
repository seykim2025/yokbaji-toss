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
              onBack();
            }}
          />
        </div>
      </div>
    </div>
  );
}
