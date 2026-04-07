import { useRef, useState } from "react";
import type { Personality, Gender, Character } from "../types";
import { createCharacter } from "../api";
import styles from "./CreateScreen.module.css";

interface Props {
  tokens: number;
  onBack: () => void;
  onCreated: (character: Character) => void;
  onCharge: () => void;
  onHome: () => void;
}

const PERSONALITIES: { value: Personality; label: string; emoji: string; desc: string }[] = [
  { value: "ANGRY", label: "분노", emoji: "\uD83D\uDE21", desc: "강하게 맞받아침" },
  { value: "SARCASTIC", label: "비꼼", emoji: "\uD83D\uDE0F", desc: "날카로운 조롱" },
  { value: "WEAK", label: "약함", emoji: "\uD83D\uDE22", desc: "울고 애원함" },
  { value: "STOIC", label: "냉정", emoji: "\uD83D\uDE10", desc: "거의 반응 없음" },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: "M", label: "남" },
  { value: "F", label: "여" },
  { value: "N", label: "중립" },
];

export default function CreateScreen({ tokens, onBack, onCreated, onCharge, onHome }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  async function handleSubmit() {
    if (!image || !personality || !gender) return;
    setLoading(true);
    setError(null);
    try {
      const character = await createCharacter(image, personality, gender, name);
      onCreated(character);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "캐릭터 생성 실패");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = image && personality && gender && !loading;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <h2 className={styles.title}>캐릭터 생성</h2>
        <div className={styles.headerRight}>
          <div className={styles.tokenDisplay}>
            <span className={styles.tokenIcon}>🪙</span>
            <span className={styles.tokenCount}>{tokens.toLocaleString()}</span>
          </div>
          <button className={styles.chargeBtn} onClick={onCharge}>충전</button>
          <button className={styles.homeBtn} onClick={onHome}>🏠</button>
        </div>
      </header>

      <div className={styles.form}>
        {/* Photo upload */}
        <button
          className={styles.photoUpload}
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" className={styles.photoPreview} />
          ) : (
            <div className={styles.photoPlaceholder}>
              <span className={styles.cameraIcon}>{"\uD83D\uDCF7"}</span>
              <span>사진 업로드</span>
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: "none" }}
        />

        {/* Name */}
        <input
          className={styles.nameInput}
          placeholder="이름 (선택)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
        />

        {/* Personality */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>성격</label>
          <div className={styles.personalityGrid}>
            {PERSONALITIES.map((p) => (
              <button
                key={p.value}
                className={`${styles.personalityCard} ${personality === p.value ? styles.selected : ""}`}
                onClick={() => setPersonality(p.value)}
              >
                <span className={styles.personalityEmoji}>{p.emoji}</span>
                <span className={styles.personalityLabel}>{p.label}</span>
                <span className={styles.personalityDesc}>{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>성별</label>
          <div className={styles.genderRow}>
            {GENDERS.map((g) => (
              <button
                key={g.value}
                className={`${styles.genderBtn} ${gender === g.value ? styles.selected : ""}`}
                onClick={() => setGender(g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={`${styles.submitBtn} ${canSubmit ? styles.submitActive : ""}`}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            "생성하기"
          )}
        </button>
      </div>
    </div>
  );
}
