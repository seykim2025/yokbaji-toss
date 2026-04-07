import { useState } from "react";
import type { Character, ReactionResult } from "../types";
import { generateReaction, API_BASE } from "../api";
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

  const isLoading = pageState === "loading";
  const personalityColor = PERSONALITY_COLOR[character.personality_type] || "#6b7280";
  const personalityLabel = PERSONALITY_LABEL[character.personality_type] || character.personality_type;

  async function handleSend() {
    const text = message.trim();
    if (!text || isLoading) return;
    setPageState("loading");
    setError(null);
    try {
      const result = await generateReaction(character.id, text);
      setReaction(result);
      setPageState("done");
      setMessage("");
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <span className={styles.headerName}>{(character.name && character.name !== "Unnamed") ? character.name : "이름 없음"}</span>
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
                  alt={character.name}
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
                  alt={character.name}
                  className={styles.loadingImage}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className={styles.loadingImageFallback}>👤</div>
              )}
            </div>
            <div className={styles.loadingLabel}>
              <span className={styles.spinner} />
              <span>잠깐만...</span>
            </div>
          </div>
        )}

        {(pageState === "done" || pageState === "error") && reaction && (
          <div className={styles.reactionView}>
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
            <div className={styles.userEcho}>
              <span className={styles.youLabel}>나:</span>
              <p className={styles.userText}>{reaction.user_message}</p>
            </div>
          </div>
        )}

        {pageState === "error" && !reaction && (
          <div className={styles.profileView}>
            <div className={styles.profileImageWrap}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={character.name}
                  className={styles.profileImage}
                />
              ) : (
                <div className={styles.profileImageFallback}>👤</div>
              )}
            </div>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}
      </div>

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
          <button
            className={`${styles.sendBtn} ${message.trim() ? styles.sendActive : ""}`}
            onClick={handleSend}
            disabled={!message.trim()}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}
