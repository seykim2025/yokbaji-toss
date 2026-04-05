import type { ReactionResult } from "../types";
import styles from "./ReactionScreen.module.css";

interface Props {
  result: ReactionResult;
  onAgain: () => void;
  onHome: () => void;
}

export default function ReactionScreen({ result, onAgain, onHome }: Props) {
  const personalityEmoji: Record<string, string> = {
    WEAK: "\uD83D\uDE22",
    ANGRY: "\uD83D\uDE21",
    SARCASTIC: "\uD83D\uDE0F",
    STOIC: "\uD83D\uDE10",
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Video / GIF */}
        {result.video_url ? (
          <div className={styles.videoWrap}>
            <video
              className={styles.video}
              src={result.video_url}
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        ) : (
          <div className={styles.noVideo}>
            <span className={styles.bigEmoji}>
              {personalityEmoji[result.personality_type] || "\uD83D\uDE36"}
            </span>
          </div>
        )}

        {/* Dialogue bubble */}
        <div className={styles.dialogueBubble}>
          <p className={styles.dialogueText}>{result.dialogue}</p>
        </div>

        {/* What user said */}
        <div className={styles.userMessage}>
          <span className={styles.youLabel}>You said:</span>
          <p className={styles.userText}>{result.user_message}</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.againBtn} onClick={onAgain}>
          Say More
        </button>
        <button className={styles.homeBtn} onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}
