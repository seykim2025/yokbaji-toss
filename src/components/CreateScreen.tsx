import { useRef, useState } from "react";
import type { Personality, Gender } from "../types";
import { createCharacter } from "../api";
import styles from "./CreateScreen.module.css";

interface Props {
  onBack: () => void;
  onCreated: (characterId: string) => void;
}

const PERSONALITIES: { value: Personality; label: string; emoji: string; desc: string }[] = [
  { value: "ANGRY", label: "Angry", emoji: "\uD83D\uDE21", desc: "Fights back hard" },
  { value: "SARCASTIC", label: "Sarcastic", emoji: "\uD83D\uDE0F", desc: "Witty comebacks" },
  { value: "WEAK", label: "Weak", emoji: "\uD83D\uDE22", desc: "Cries and begs" },
  { value: "STOIC", label: "Stoic", emoji: "\uD83D\uDE10", desc: "Barely reacts" },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "N", label: "Neutral" },
];

export default function CreateScreen({ onBack, onCreated }: Props) {
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
      onCreated(character.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create character");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = image && personality && gender && !loading;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>&larr;</button>
        <h2 className={styles.title}>Create Character</h2>
        <div className={styles.spacer} />
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
              <span>Upload photo</span>
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
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
        />

        {/* Personality */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Personality</label>
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
          <label className={styles.sectionLabel}>Voice Type</label>
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
            "Create & Start"
          )}
        </button>
      </div>
    </div>
  );
}
