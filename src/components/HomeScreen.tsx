import { useEffect, useState, useCallback } from "react";
import type { Character } from "../types";
import { listCharacters, deleteCharacterLocally, API_BASE, getLastUsed, DEFAULT_SLOT_COUNT, isDefaultCharacter } from "../api";
import MainFooterBannerAd from "./MainFooterBannerAd";
import styles from "./HomeScreen.module.css";

interface Props {
  tokens: number;
  totalSlots: number;
  version: string;
  userName?: string | null;
  isCreating?: boolean;
  onCreateNew: () => void;
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

export default function HomeScreen({ tokens, totalSlots, version, userName, isCreating, onCreateNew, onSelectCharacter, onAddSlot, onCharge }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(() => {
    listCharacters()
      .then((list) => {
        const lastUsed = getLastUsed();
        const sorted = [...list].sort((a, b) => {
          const aTime = lastUsed[a.id] ?? a.created_at;
          const bTime = lastUsed[b.id] ?? b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        setCharacters(sorted);
      })
      .catch(() => setCharacters([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleDeleteRequest(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    setDeleteTarget({ id, name });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteCharacterLocally(deleteTarget.id);
    setCharacters((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const emptySlotCount = Math.max(0, totalSlots - characters.length);

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
                {!isDefaultCharacter(c.id) && (
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDeleteRequest(e, c.id, (c.name && c.name !== "Unnamed") ? c.name : "이름 없음")}
                    aria-label="삭제"
                  >
                    ✕
                  </button>
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
          ))}

          {/* Empty slot cards */}
          {Array.from({ length: emptySlotCount }).map((_, i) => {
            const slotIndex = characters.length + i;
            const isPaid = slotIndex >= DEFAULT_SLOT_COUNT;
            return (
              <button
                key={`empty-${i}`}
                className={`${styles.emptySlot} ${isPaid ? styles.paidSlot : ""}`}
                onClick={onCreateNew}
              >
                <span className={styles.emptyPlus}>+</span>
                {isPaid && <span className={styles.paidBadge}>코인</span>}
              </button>
            );
          })}

          {/* Add slot button (always last) */}
          <button className={styles.addSlotCard} onClick={onAddSlot}>
            <span className={styles.addSlotIcon}>＋</span>
            <span className={styles.addSlotLabel}>슬롯 추가</span>
            <span className={styles.addSlotCost}>{10} 🪙</span>
          </button>
        </div>
      )}

      {/* Banner ad — hidden while creating/generating to avoid overlap */}
      <MainFooterBannerAd hidden={isCreating} />

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>정말 삭제할까요?</h3>
            <p className={styles.modalBody}>
              삭제하면 이 캐릭터와 대화 기록을 다시 불러올 수 없어요.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeleteTarget(null)}>
                취소
              </button>
              <button className={styles.modalConfirm} onClick={handleDeleteConfirm}>
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
