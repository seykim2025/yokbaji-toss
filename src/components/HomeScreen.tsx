import { useEffect, useState } from "react";
import type { Character } from "../types";
import { listCharacters } from "../api";
import styles from "./HomeScreen.module.css";

interface Props {
  onCreateNew: () => void;
  onSelectCharacter: (character: Character) => void;
}

export default function HomeScreen({ onCreateNew, onSelectCharacter }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCharacters()
      .then(setCharacters)
      .catch(() => setCharacters([]))
      .finally(() => setLoading(false));
  }, []);

  const personalityEmoji: Record<string, string> = {
    WEAK: "\uD83D\uDE22",
    ANGRY: "\uD83D\uDE21",
    SARCASTIC: "\uD83D\uDE0F",
    STOIC: "\uD83D\uDE10",
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>yokbaji</h1>
        <p className={styles.subtitle}>Emotional Trash Can</p>
      </header>

      <button className={styles.createBtn} onClick={onCreateNew}>
        <span className={styles.createIcon}>+</span>
        <span>New Character</span>
      </button>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      ) : characters.length === 0 ? (
        <div className={styles.empty}>
          <p>No characters yet.</p>
          <p className={styles.emptyHint}>Create one to start venting!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {characters.map((c) => (
            <button
              key={c.id}
              className={styles.card}
              onClick={() => onSelectCharacter(c)}
            >
              <div className={styles.cardEmoji}>
                {personalityEmoji[c.personality_type] || "\uD83D\uDE36"}
              </div>
              <div className={styles.cardInfo}>
                <span className={styles.cardName}>{c.name || "Unnamed"}</span>
                <span className={styles.cardType}>
                  {c.personality_type.toLowerCase()}
                </span>
              </div>
              <span className={styles.cardArrow}>&rsaquo;</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
