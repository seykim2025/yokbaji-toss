import { useState } from "react";
import type { Character, ReactionResult } from "../types";
import { generateReaction } from "../api";
import styles from "./ChatScreen.module.css";

interface Props {
  character: Character;
  onBack: () => void;
  onReaction: (result: ReactionResult) => void;
}

export default function ChatScreen({ character, onBack, onReaction }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateReaction(character.id, text);
      onReaction(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate reaction");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const personalityEmoji: Record<string, string> = {
    WEAK: "\uD83D\uDE22",
    ANGRY: "\uD83D\uDE21",
    SARCASTIC: "\uD83D\uDE0F",
    STOIC: "\uD83D\uDE10",
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>&larr;</button>
        <div className={styles.headerInfo}>
          <span className={styles.headerEmoji}>
            {personalityEmoji[character.personality_type] || "\uD83D\uDE36"}
          </span>
          <div className={styles.headerText}>
            <span className={styles.headerName}>{character.name || "Unnamed"}</span>
            <span className={styles.headerType}>{character.personality_type.toLowerCase()}</span>
          </div>
        </div>
        <div className={styles.spacer} />
      </header>

      <div className={styles.body}>
        <div className={styles.prompt}>
          <p className={styles.promptMain}>What do you want to say?</p>
          <p className={styles.promptSub}>Let it all out. They can take it.</p>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {loading && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Generating reaction...</p>
          </div>
        )}
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.textarea}
          placeholder="Type your feelings..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={500}
          disabled={loading}
        />
        <button
          className={`${styles.sendBtn} ${message.trim() && !loading ? styles.sendActive : ""}`}
          onClick={handleSend}
          disabled={!message.trim() || loading}
        >
          {loading ? <span className={styles.sendSpinner} /> : "\u2191"}
        </button>
      </div>
    </div>
  );
}
