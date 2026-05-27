import { useEffect, useState, useCallback } from "react";
import type { Character } from "../types";
import { listCharacters, API_BASE, getLastUsed, DEFAULT_SLOT_COUNT, getPaidCharacterIds } from "../api";
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
  totalSlots: number;
  version: string;
  userName?: string | null;
  isCreating?: boolean;
  cachedCharacters?: Character[];
  onCharactersLoaded?: (characters: Character[]) => void;
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
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}



export default function HomeScreen({ tokens, totalSlots, version, userName, cachedCharacters = [], onCharactersLoaded, onCreateNew, onSelectCharacter, onAddSlot, onCharge }: Props) {
  const hasCache = cachedCharacters.length > 0;
  const [characters, setCharacters] = useState<Character[]>(cachedCharacters);
  const [loading, setLoading] = useState(!hasCache);
  const [slowLoad, setSlowLoad] = useState(false);

  const applySort = useCallback((list: Character[]) => {
    const lastUsed = getLastUsed();
    return [...list].sort((a, b) => {
      const aTime = lastUsed[a.id] ?? a.created_at;
      const bTime = lastUsed[b.id] ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, []);

  const load = useCallback((background = false) => {
    const t0 = performance.now();
    console.log("[yokbaji] character list fetch start (background=" + background + ")");
    if (!background) {
      setLoading(true);
      setSlowLoad(false);
    }
    const slowTimer = background ? null : setTimeout(() => setSlowLoad(true), 3000);
    listCharacters()
      .then((list) => {
        const elapsed = (performance.now() - t0).toFixed(0);
        console.log("[yokbaji] character list fetch done:", elapsed + "ms, count:", list.length);
        const sorted = applySort(list);
        setCharacters(sorted);
        onCharactersLoaded?.(sorted);
      })
      .catch(() => { if (!background) setCharacters([]); })
      .finally(() => {
        if (slowTimer) clearTimeout(slowTimer);
        if (!background) {
          setLoading(false);
          setSlowLoad(false);
        }
      });
  }, [applySort, onCharactersLoaded]);

  useEffect(() => {
    const t0 = performance.now();
    console.log("[yokbaji] HomeScreen mount:", t0.toFixed(0) + "ms, cached:", cachedCharacters.length);
    if (hasCache) {
      // Re-apply sort with latest last_used data, then do background refresh
      setCharacters(applySort(cachedCharacters));
      load(true);
    } else {
      load(false);
    }
    // measure full render complete
    requestAnimationFrame(() => {
      console.log("[yokbaji] HomeScreen render complete:", (performance.now() - t0).toFixed(0) + "ms");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paidCharIds = getPaidCharacterIds(characters);
  const freeUsed = characters.filter((c) => !paidCharIds.has(c.id)).length;
  const paidUsed = characters.filter((c) => paidCharIds.has(c.id)).length;

  const freeEmptyCount = Math.max(0, DEFAULT_SLOT_COUNT - freeUsed);
  const paidEmptyCount = Math.max(0, (totalSlots - DEFAULT_SLOT_COUNT) - paidUsed);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>욕바지</h1>
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
        {loading ? (
          <>
            <SkeletonGrid />
            {slowLoad && (
              <div className={styles.loading} style={{ flex: "none", paddingBottom: 16 }}>
                <p className={styles.loadingText}>조금 오래 걸리고 있어요. 잠시만 기다려주세요 🙏</p>
              </div>
            )}
          </>
        ) : (
          <div className={styles.grid}>
            {/* Character cards */}
            {characters.map((c) => {
              const isPaid = paidCharIds.has(c.id);
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
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.log("[yokbaji] thumbnail loaded:", img.src.split("/").pop());
                        }}
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

            {/* Add slot button (always last) */}
            <button className={styles.addSlotCard} onClick={onAddSlot}>
              <span className={styles.addSlotIcon}>＋</span>
              <span className={styles.addSlotLabel}>슬롯 추가</span>
              <span className={styles.addSlotCost}>{10} 🪙</span>
            </button>
          </div>
        )}
      </div>

      {/* Banner ad — always visible at bottom, outside scroll area */}
      <MainFooterBannerAd />

    </div>
  );
}
