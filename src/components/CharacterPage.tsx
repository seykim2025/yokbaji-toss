import { useState, useEffect, useRef, useCallback } from "react";
import type { Character, ReactionResult } from "../types";
import {
  generateReaction, API_BASE, setLastUsed,
  getFreeCount, incrementFreeCount, isFreeExhausted, FREE_LIMIT,
  saveConversation, getConversations, deleteConversations,
  spendConversationCoin
} from "../api";
import type { ConversationRecord } from "../api";
import MainFooterBannerAd from "./MainFooterBannerAd";
import styles from "./CharacterPage.module.css";

interface Props {
  character: Character;
  tokens: number;
  onBack: () => void;
  onHome: () => void;
  onCharge: () => void;
  onDeleted?: () => void;
  onTokenSpent?: (amount: number) => void;
}

type PageState = "idle" | "loading" | "done" | "error";

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

const WAITING_LINES: Record<string, string[]> = {
  WEAK: [
    "잠깐만… 나 지금 생각 중이야…",
    "어… 금방 말할게…",
    "너무 재촉하진 마…",
    "조금만 기다려줘…",
    "지금 뭐라고 해야 할지…",
    "마음이 복잡해서…",
    "울 것 같아서 잠깐…",
    "제발 조금만…",
    "생각이 잘 안 나…",
    "미안, 금방이야…",
    "잠깐만, 표정 고르는 중이야.",
    "지금 얼굴 좀 맞춰보고 있어.",
  ],
  ANGRY: [
    "잠깐, 지금 한마디 준비 중이야.",
    "야, 기다려. 바로 받아칠 거니까.",
    "말 정리하고 있으니까 끼어들지 마.",
    "지금 제대로 말해줄게.",
    "한 번만 더 기다려봐.",
    "이게 쉬운 줄 알아?",
    "잠깐이라고.",
    "지금 집중 중이야.",
    "끊지 마.",
    "곧 폭발한다.",
    "말은 들었고, 반응 준비 중.",
    "기다려봐, 대충 나오면 재미없잖아.",
    "얼굴 확인하고 바로 받아칠게.",
  ],
  SARCASTIC: [
    "아, 잠깐. 웃기게 받아쳐줄게.",
    "기다려봐, 그 말에 어울리는 답 찾는 중이야.",
    "와, 급하긴. 금방 대답해줄게.",
    "이렇게 기다리는 것도 실력이야.",
    "천천히. 좋은 말이 나올 테니까.",
    "글쎄, 뭐라고 해야 제일 황당할까…",
    "잠깐, 최고의 비꼬기 선택 중.",
    "급하면 먼저 가든가.",
    "이거 생각보다 창의력이 필요해.",
    "알겠어, 잠깐만.",
    "지금 어떤 표정으로 받을지 고르는 중이야.",
    "곧 나와. 너무 재촉하지 마.",
  ],
  STOIC: [
    "잠깐.",
    "정리 중이야.",
    "금방 끝나.",
    "기다려.",
    "생각 중.",
    "잠시.",
    "준비 중.",
    "조금만.",
    "알겠어.",
    "금방.",
  ],
};

function getWaitingLine(personality: string, exclude: string | null): string {
  const lines = WAITING_LINES[personality] ?? WAITING_LINES.STOIC;
  const choices = lines.filter((l) => l !== exclude);
  return choices[Math.floor(Math.random() * choices.length)];
}

function getImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "어제";
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  }
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function CharacterPage({ character, tokens, onHome, onCharge, onDeleted, onTokenSpent }: Props) {
  const [message, setMessage] = useState("");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [reaction, setReaction] = useState<ReactionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitingLine, setWaitingLine] = useState<string>(() =>
    getWaitingLine(character.personality_type, null)
  );
  const [freeCount, setFreeCount] = useState(() => getFreeCount(character.id));
  const waitingLineRef = useRef<string>(waitingLine);
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recent history for repetition reduction (sent to engine each request)
  const [recentDialogueIds, setRecentDialogueIds] = useState<string[]>([]);
  const [recentBaseAssetCodes, setRecentBaseAssetCodes] = useState<string[]>([]);

  // Conversation history
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationRecord[]>(() =>
    getConversations(character.id)
  );
  const [selectedConv, setSelectedConv] = useState<ConversationRecord | null>(null);

  // Engine debug panel

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const canDelete = false; // Phase 1: character deletion disabled
  const videoRef = useRef<HTMLVideoElement>(null);

  // Imperatively call play() because autoPlay attribute is unreliable in iOS WebView
  useEffect(() => {
    if (reaction?.video_url && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [reaction?.video_url]);

  const isLoading = pageState === "loading";
  const personalityColor = PERSONALITY_COLOR[character.personality_type] || "#6b7280";
  const personalityLabel = PERSONALITY_LABEL[character.personality_type] || character.personality_type;
  const isPaid = isFreeExhausted(character.id);

  // Rotate waiting line during loading
  useEffect(() => {
    if (!isLoading) {
      if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
      return;
    }
    function rotate() {
      const next = getWaitingLine(character.personality_type, waitingLineRef.current);
      waitingLineRef.current = next;
      setWaitingLine(next);
      const delay = 5000 + Math.random() * 5000;
      waitingTimerRef.current = setTimeout(rotate, delay);
    }
    const delay = 5000 + Math.random() * 5000;
    waitingTimerRef.current = setTimeout(rotate, delay);
    return () => { if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current); };
  }, [isLoading, character.personality_type]);

  async function handleSend() {
    const text = message.trim();
    if (!text || isLoading) return;
    const initial = getWaitingLine(character.personality_type, null);
    waitingLineRef.current = initial;
    setWaitingLine(initial);
    setPageState("loading");
    setError(null);
    setSelectedConv(null);

    // If paid, check tokens first
    if (isPaid && tokens < 1) {
      setPageState("idle");
      onCharge();
      return;
    }

    try {
      if (isPaid) {
        const spendRes = await spendConversationCoin();
        if (!spendRes.success) {
          setPageState("idle");
          onCharge();
          return;
        }
        onTokenSpent?.(1); // update UI
      }

      const result = await generateReaction(character.id, text, recentDialogueIds, recentBaseAssetCodes);
      
      setReaction(result);
      setPageState("done");
      setMessage("");
      const newCount = incrementFreeCount(character.id);
      setFreeCount(newCount);
      setLastUsed(character.id);
      // Update recent history for repetition reduction
      if (result.dialogue_id) {
        setRecentDialogueIds((prev) => [result.dialogue_id!, ...prev].slice(0, 10));
      }
      if (result.base_asset_code) {
        setRecentBaseAssetCodes((prev) => [result.base_asset_code!, ...prev].slice(0, 5));
      }
      // Save to history
      saveConversation(character.id, text, result.dialogue, result.video_url);
      setConversations(getConversations(character.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "리액션 생성 실패");
      setPageState("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  const handleSelectConv = useCallback((conv: ConversationRecord) => {
    setSelectedConv(conv);
    setReaction({
      character_id: character.id,
      user_message: conv.userMessage,
      dialogue: conv.dialogue,
      video_url: conv.videoUrl,
      personality_type: character.personality_type,
      cached: false,
    });
    setPageState("done");
    setShowHistory(false);
  }, [character.id, character.personality_type]);

  const imageUrl = getImageUrl(character.image_path);
  const displayName = (character.name && character.name !== "Unnamed") ? character.name : "이름 없음";

  // Paid conversation count estimate (1 token = 1 conversation)
  const paidCountAvailable = tokens;



  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.backBtn} style={{ visibility: "hidden", pointerEvents: "none" }} />
        <span className={styles.headerName}>{displayName}</span>
        <div className={styles.headerRight}>
          {conversations.length > 0 && (
            <button
              className={styles.historyBtn}
              onClick={() => setShowHistory(true)}
              title="지난 대화 보기"
            >
              📋
            </button>
          )}
          <div className={styles.tokenDisplay}>
            <span className={styles.tokenIcon}>🪙</span>
            <span className={styles.tokenCount}>{tokens.toLocaleString()}</span>
          </div>
          <button className={styles.chargeBtn} onClick={onCharge}>충전</button>
          {canDelete && (
            <button
              className={styles.deleteCharBtn}
              onClick={() => setShowDeleteModal(true)}
              aria-label="캐릭터 삭제"
            >
              🗑
            </button>
          )}
          <button className={styles.homeBtn} onClick={onHome}>🏠</button>
        </div>
      </header>



      {/* Body */}
      <div className={styles.body}>
        {pageState === "idle" && (
          <div className={styles.profileView}>
            <div className={styles.profileImageWrap}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={displayName}
                  className={styles.profileImage}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className={styles.profileImageFallback}>👤</div>
              )}
            </div>
            <span
              className={styles.personalityBadge}
              style={{ background: personalityColor + "22", color: personalityColor }}
            >
              {personalityLabel}
            </span>
            <p className={styles.idlePrompt}>감정을 쏟아내 버려요</p>
            {conversations.length > 0 && (
              <button className={styles.historyLinkBtn} onClick={() => setShowHistory(true)}>
                지난 대화 보기 ({conversations.length})
              </button>
            )}
          </div>
        )}

        {pageState === "loading" && (
          <div className={styles.loadingView}>
            <div className={styles.loadingImageWrap}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={displayName}
                  className={styles.loadingImage}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className={styles.loadingImageFallback}>👤</div>
              )}
            </div>
            <div className={styles.loadingLabel}>
              <span className={styles.spinner} />
              <span key={waitingLine} className={styles.waitingText}>{waitingLine}</span>
            </div>
          </div>
        )}

        {(pageState === "done" || pageState === "error") && reaction && (
          <div className={styles.reactionView}>
            {selectedConv && (
              <div className={styles.historyNotice}>
                <span>📋 {formatTimestamp(selectedConv.timestamp)}의 대화</span>
                <button className={styles.historyNoticeClose} onClick={() => {
                  setSelectedConv(null);
                  setReaction(null);
                  setPageState("idle");
                }}>✕</button>
              </div>
            )}
            {/* User input */}
            <div className={styles.userEcho}>
              <span className={styles.youLabel}>나:</span>
              <p className={styles.userText}>{reaction.user_message}</p>
            </div>

            {/* Character reaction */}
            {reaction.video_url ? (
              <div className={styles.videoWrap}>
                <video
                  key={reaction.video_url}
                  ref={videoRef}
                  className={styles.video}
                  src={reaction.video_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                />
                <div className={styles.videoOverlay} />
              </div>
            ) : (
              <div className={styles.noVideo}>
                <span className={styles.noVideoEmoji}>😶</span>
              </div>
            )}
            <div className={styles.speechBubble}>
              {Array.isArray(reaction.dialogue) ? (
                reaction.dialogue.map((line, i) => (
                  <p key={i} className={styles.dialogueText}>{line}</p>
                ))
              ) : (
                <p className={styles.dialogueText}>{reaction.dialogue}</p>
              )}
            </div>
          </div>
        )}

        {pageState === "error" && !reaction && (
          <div className={styles.profileView}>
            <div className={styles.profileImageWrap}>
              {imageUrl ? (
                <img src={imageUrl} alt={displayName} className={styles.profileImage} />
              ) : (
                <div className={styles.profileImageFallback}>👤</div>
              )}
            </div>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}
      </div>

      {/* Free/paid count bar */}
      {pageState !== "loading" && (
        <div className={styles.freeCountBar}>
          {isPaid ? (
            <span className={styles.paidLabel}>🪙 유료 대화 모드 · {paidCountAvailable}건 가능</span>
          ) : (
            <span className={styles.freeLabel}>무료 대화 {FREE_LIMIT - freeCount}/{FREE_LIMIT}</span>
          )}
        </div>
      )}

      {/* Input bar */}
      {pageState !== "loading" && (
        <div className={styles.inputArea}>
          <textarea
            className={styles.textarea}
            placeholder="감정을 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={500}
          />
          {isPaid ? (
            <button
              className={`${styles.sendBtn} ${message.trim() ? styles.sendPaid : ""}`}
              onClick={handleSend}
              disabled={!message.trim()}
            >
              🪙
            </button>
          ) : (
            <button
              className={`${styles.sendBtn} ${message.trim() ? styles.sendActive : ""}`}
              onClick={handleSend}
              disabled={!message.trim()}
            >
              ↑
            </button>
          )}
        </div>
      )}

      {/* Bottom banner ad — always visible at bottom */}
      <MainFooterBannerAd />

      {/* Delete character modal */}
      {showDeleteModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "28px 24px 20px", width: "min(300px, 88vw)", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: "#191f28", marginBottom: 8 }}>캐릭터를 삭제하시겠습니까?</p>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.5 }}>삭제하면 이 캐릭터의 대화 기록도 모두 삭제됩니다.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "#f2f3f4", color: "#4e5968", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer" }}
                onClick={() => setShowDeleteModal(false)}
              >
                취소
              </button>
              <button
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "#F04438", color: "#fff", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer" }}
                onClick={() => {
                  deleteConversations(character.id);
                  setShowDeleteModal(false);
                  (onDeleted ?? onHome)();
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History drawer */}
      {showHistory && (
        <div className={styles.historyOverlay} onClick={() => setShowHistory(false)}>
          <div className={styles.historyPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.historyHeader}>
              <span className={styles.historyTitle}>지난 대화</span>
              <button className={styles.historyClose} onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className={styles.historyList}>
              {conversations.length === 0 ? (
                <p className={styles.historyEmpty}>아직 대화 기록이 없어요.</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className={styles.historyItem}
                    onClick={() => handleSelectConv(conv)}
                  >
                    <p className={styles.historyItemMsg}>{conv.userMessage}</p>
                    <span className={styles.historyItemTime}>{formatTimestamp(conv.timestamp)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
