import { useEffect, useState, useCallback } from "react";
import type { Character } from "../types";
import { listCharacters, deleteCharacterLocally, API_BASE } from "../api";
import styles from "./HomeScreen.module.css";

interface Props {
  tokens: number;
  onCreateNew: () => void;
  onSelectCharacter: (character: Character) => void;
  onCharge: () => void;
}

const PERSONALITY_COLOR: Record<string, string> = {
  WEAK: "#60a5fa",
  ANGRY: "#ef4444",
  SARCASTIC: "#a855f7",
  STOIC: "#6b7280",
};

const PERSONALITY_LABEL: Record<string, string> = {
  WEAK: "Weak",
  ANGRY: "Angry",
  SARCASTIC: "Sarcastic",
  STOIC: "Stoic",
};

const TOTAL_FREE_SLOTS = 5;

function getImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function HomeScreen({ tokens, onCreateNew, onSelectCharacter, onCharge }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    listCharacters()
      .then((list) => {
        const sorted = [...list].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setCharacters(sorted);
      })
      .catch(() => setCharacters([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    deleteCharacterLocally(id);
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }

  const emptySlotCount = Math.max(0, TOTAL_FREE_SLOTS - characters.length);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>yokbaji</h1>
          <p className={styles.subtitle}>Let it all out.</p>
        </div>
        <div className={styles.tokenBar}>
          <div className={styles.tokenDisplay}>
            <span className={styles.tokenIcon}>🪙</span>
            <span className={styles.tokenCount}>{tokens.toLocaleString()}</span>
          </div>
          <button className={styles.chargeBtn} onClick={onCharge}>Top Up</button>
        </div>
      </header>

      {/* Character Grid */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      ) : (
        <div className={styles.grid}>
          {/* Character cards */}
          {characters.map((c) => (
            <button
              key={c.id}
              className={styles.characterCard}
              onClick={() => onSelectCharacter(c)}
            >
              <div className={styles.cardImageWrap}>
                {c.image_path ? (
                  <img
                    src={getImageUrl(c.image_path)}
                    alt={c.name}
                    className={styles.cardImage}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className={styles.cardImageFallback}>
                    <span className={styles.fallbackEmoji}>👤</span>
                  </div>
                )}
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(e, c.id)}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.cardName}>{c.name || "Unnamed"}</span>
                <span
                  className={styles.personalityBadge}
                  style={{ background: PERSONALITY_COLOR[c.personality_type] + "22", color: PERSONALITY_COLOR[c.personality_type] }}
                >
                  {PERSONALITY_LABEL[c.personality_type] || c.personality_type}
                </span>
              </div>
            </button>
          ))}

          {/* Empty slot cards */}
          {Array.from({ length: emptySlotCount }).map((_, i) => (
            <button
              key={`empty-${i}`}
              className={styles.emptySlot}
              onClick={onCreateNew}
            >
              <span className={styles.emptyPlus}>+</span>
            </button>
          ))}

          {/* Add slot button (always last) */}
          <button className={styles.addSlotCard} onClick={onCharge}>
            <span className={styles.addSlotIcon}>＋</span>
            <span className={styles.addSlotLabel}>Add Slot</span>
            <span className={styles.addSlotCost}>10 🪙</span>
          </button>
        </div>
      )}
    </div>
  );
}
