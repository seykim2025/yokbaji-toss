import styles from "./TokenPage.module.css";

interface Props {
  onBack: () => void;
}

export default function TokenPage({ onBack }: Props) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <h2 className={styles.title}>토큰 충전</h2>
        <div className={styles.spacer} />
      </header>
      <div className={styles.body}>
        <span className={styles.icon}>🪙</span>
        <p className={styles.message}>토큰 충전 기능은 준비 중입니다.</p>
        <p className={styles.sub}>곧 업데이트될 예정이에요!</p>
      </div>
    </div>
  );
}
