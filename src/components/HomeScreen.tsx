import { useCallback } from "react";
import type { Character } from "../types";
import { API_BASE, getLastUsed } from "../api";
import MainFooterBannerAd from "./MainFooterBannerAd";
import styles from "./HomeScreen.module.css";

function SkeletonGrid() {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonImageArea} />
          <div className={styles.skeletonFooter}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  tokens: number;
  freeSlots: number;
  paidSlots: number;
  version: string;
  userName?: string | null;
  isCreating?: boolean;
  cachedCharacters: Character[];
  onCreateNew: (isPaid: boolean) => void;
  onSelectCharacter: (character: Character) => void;
  onAddSlot: () => void;
  onCharge: () => void;
}

const PERSONALITY_COLOR: Record<string, string> = {
  WEAK: "#60a5fa",
  ANGRY: "#ef4444",
  SARCASTIC: "#a855f7",
  STOIC: "#6b7280",
};

const PERSONALITY_LABEL: Record<string, string> = {
  WEAK: "약함",
  ANGRY: "분노",
  SARCASTIC: "비꼼",
  STOIC: "냉정",
};

function getImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path === "/girl.jpeg" || path === "/man.jpeg") return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function HomeScreen({ tokens, freeSlots, paidSlots, version, userName, cachedCharacters, onCreateNew, onSelectCharacter, onAddSlot, onCharge }: Props) {

  const applySort = useCallback((list: Character[]) => {
    const lastUsed = getLastUsed();
    return [...list].sort((a, b) => {
      const aTime = lastUsed[a.id] ?? a.created_at;
      const bTime = lastUsed[b.id] ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, []);

  const characters = applySort(cachedCharacters);

  const freeUsed = characters.filter((c) => c.slotType === "free").length;
  const paidUsed = characters.filter((c) => c.slotType === "paid").length;

  const freeEmptyCount = Math.max(0, freeSlots - freeUsed);
  const paidEmptyCount = Math.max(0, paidSlots - paidUsed);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <span className={styles.versionBadge}>{version}</span>
          </div>
          <p className={styles.subtitle}>
            {userName ? `${userName}님, 감정을 쏟아내 버려요` : "감정을 쏟아내 버려요"}
          </p>
        </div>
        <div className={styles.tokenBar}>
          <div className={styles.tokenDisplay}>
            <span className={styles.tokenIcon}>🪙</span>
            <span className={styles.tokenCount}>{tokens.toLocaleString()}</span>
          </div>
          <button className={styles.chargeBtn} onClick={onCharge}>충전</button>
        </div>
      </header>

      {/* Scrollable character grid area */}
      <div className={styles.scrollContent}>
        {characters.length === 0 && freeSlots === 0 && paidSlots === 0 ? (
          <SkeletonGrid />
        ) : (
          <div className={styles.grid}>
            {/* Character cards */}
            {characters.map((c) => {
              const isPaid = c.slotType === "paid";
              return (
                <button
                  key={c.id}
                  className={`${styles.characterCard} ${isPaid ? styles.characterCardPaid : ""}`}
                  onClick={() => onSelectCharacter(c)}
                >
                  <div className={styles.cardImageWrap}>
                    {isPaid && <span className={styles.charPaidBadge}>🪙</span>}
                    {c.image_path ? (
                      <img
                        src={getImageUrl(c.image_path)}
                        alt={c.name}
                        className={styles.cardImage}
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className={styles.cardImageFallback}>
                        <span className={styles.fallbackEmoji}>👤</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardName}>{(c.name && c.name !== "Unnamed") ? c.name : "이름 없음"}</span>
                    <span
                      className={styles.personalityBadge}
                      style={{ background: PERSONALITY_COLOR[c.personality_type] + "22", color: PERSONALITY_COLOR[c.personality_type] }}
                    >
                      {PERSONALITY_LABEL[c.personality_type] || c.personality_type}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Free Empty slot cards */}
            {Array.from({ length: freeEmptyCount }).map((_, i) => (
              <button
                key={`empty-free-${i}`}
                className={styles.emptySlot}
                onClick={() => onCreateNew(false)}
              >
                <span className={styles.emptyPlus}>+</span>
              </button>
            ))}

            {/* Paid Empty slot cards */}
            {Array.from({ length: paidEmptyCount }).map((_, i) => (
              <button
                key={`empty-paid-${i}`}
                className={`${styles.emptySlot} ${styles.paidSlot}`}
                onClick={() => onCreateNew(true)}
              >
                <span className={styles.emptyPlus}>+</span>
                <span className={styles.paidBadge}>코인</span>
              </button>
            ))}

            {/* Add slot button (always last, only if no free slots) */}
            {freeEmptyCount === 0 && (
              <button className={styles.addSlotCard} onClick={onAddSlot}>
                <span className={styles.addSlotIcon}>＋</span>
                <span className={styles.addSlotLabel}>슬롯 추가</span>
                <span className={styles.addSlotCost}>{10} 🪙</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Banner ad — always visible at bottom, outside scroll area */}
      <MainFooterBannerAd />
    </div>
  );
}
