import styles from "./TokenPage.module.css";

interface Props {
  onBack: () => void;
}

export default function TokenPage({ onBack }: Props) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <h2 className={styles.title}>Token Top Up</h2>
        <div className={styles.spacer} />
      </header>
      <div className={styles.body}>
        <span className={styles.icon}>🪙</span>
        <p className={styles.message}>Token top-up is coming soon.</p>
        <p className={styles.sub}>Check back shortly!</p>
      </div>
    </div>
  );
}
