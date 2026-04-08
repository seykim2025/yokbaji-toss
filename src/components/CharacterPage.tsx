import { useState, useEffect, useRef } from "react";
import type { Character, ReactionResult } from "../types";
import { generateReaction, API_BASE, setLastUsed, getFreeCount, incrementFreeCount, isFreeExhausted, FREE_LIMIT } from "../api";
import styles from "./CharacterPage.module.css";

interface Props {
  character: Character;
  tokens: number;
  onBack: () => void;
  onHome: () => void;
  onCharge: () => void;
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

export default function CharacterPage({ character, tokens, onBack, onHome, onCharge }: Props) {
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
    try {
      const result = await generateReaction(character.id, text);
      setReaction(result);
      setPageState("done");
      setMessage("");
      const newCount = incrementFreeCount(character.id);
      setFreeCount(newCount);
      setLastUsed(character.id);
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

  const imageUrl = getImageUrl(character.image_path);
  const displayName = (character.name && character.name !== "Unnamed") ? character.name : "이름 없음";

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <span className={styles.headerName}>{displayName}</span>
        <div className={styles.headerRight}>
          <div className={styles.tokenDisplay}>
            <span className={styles.tokenIcon}>🪙</span>
            <span className={styles.tokenCount}>{tokens.toLocaleString()}</span>
          </div>
          <button className={styles.chargeBtn} onClick={onCharge}>충전</button>
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
            {/* User input first */}
            <div className={styles.userEcho}>
              <span className={styles.youLabel}>나:</span>
              <p className={styles.userText}>{reaction.user_message}</p>
            </div>

            {/* Character reaction */}
            {reaction.video_url ? (
              <div className={styles.videoWrap}>
                <video
                  className={styles.video}
                  src={reaction.video_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            ) : (
              <div className={styles.noVideo}>
                <span className={styles.noVideoEmoji}>😶</span>
              </div>
            )}
            <div className={styles.speechBubble}>
              <p className={styles.dialogueText}>{reaction.dialogue}</p>
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

      {/* Free count indicator */}
      {pageState !== "loading" && (
        <div className={styles.freeCountBar}>
          {isPaid ? (
            <span className={styles.paidLabel}>🪙 유료 대화 모드</span>
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
    </div>
  );
}
