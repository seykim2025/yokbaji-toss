import { useRef, useState } from "react";
import type { Personality, Gender, Character } from "../types";
import { createCharacter } from "../api";
import { isTossWebView } from "../toss";
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

async function base64ToFile(base64: string, filename: string): Promise<File> {
  const res = await fetch(`data:image/jpeg;base64,${base64}`);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/jpeg" });
}

async function dataUriToFile(dataUri: string, filename: string): Promise<File> {
  const res = await fetch(dataUri);
  const blob = await res.blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], filename, { type });
}

export default function CreateScreen({ tokens, onBack, onCreated, onCharge, onHome }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTossPhotoPickOrFallback() {
    if (isTossWebView()) {
      try {
        const sdk = await import("@apps-in-toss/web-framework");
        if (sdk.fetchAlbumPhotos) {
          const photos = await sdk.fetchAlbumPhotos({ maxCount: 1, maxWidth: 1024, base64: true });
          if (photos.length > 0) {
            const photo = photos[0];
            // dataUri is base64 string when base64:true
            const file = await base64ToFile(photo.dataUri, "photo.jpg");
            setImage(file);
            setPreview(URL.createObjectURL(file));
            return;
          }
        }
      } catch (err) {
        console.error("[CreateScreen] fetchAlbumPhotos failed:", err);
        // fall through to standard file input
      }
    }
    fileRef.current?.click();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  // Also handle dataUri-based photos from camera/file drops
  async function handleImageDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!image || !personality || !gender || loading) return;
    setLoading(true);
    setError(null);
    try {
      let uploadFile = image;
      // If image is a blob: URL (from fetchAlbumPhotos with base64:false), re-fetch to File
      if (image.size === 0 && image.name === "photo.jpg") {
        // Already handled in handleTossPhotoPick, but guard here too
        uploadFile = await dataUriToFile(preview!, "photo.jpg");
      }
      console.log("[CreateScreen] creating character:", uploadFile.name, uploadFile.size, uploadFile.type);
      const character = await createCharacter(uploadFile, personality, gender, name);
      onCreated(character);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "캐릭터 생성 실패";
      console.error("[CreateScreen] createCharacter error:", msg, err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = image && personality && gender && !loading;

  return (
    <div className={styles.container}>
      {/* Blocking overlay during generation */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", zIndex: 999, gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, border: "4px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff", borderRadius: "50%",
            animation: "yokbajiSpin 0.8s linear infinite",
          }} />
          <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, margin: 0 }}>
            캐릭터를 생성 중입니다...
          </p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>
            잠시만 기다려주세요.
          </p>
        </div>
      )}

      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} disabled={loading}>←</button>
        <h2 className={styles.title}>캐릭터 생성</h2>
        <div className={styles.headerRight}>
          <div className={styles.tokenDisplay}>
            <span className={styles.tokenIcon}>🪙</span>
            <span className={styles.tokenCount}>{tokens.toLocaleString()}</span>
          </div>
          <button className={styles.chargeBtn} onClick={onCharge} disabled={loading}>충전</button>
          <button className={styles.homeBtn} onClick={onHome} disabled={loading}>🏠</button>
        </div>
      </header>

      <div className={styles.form}>
        {/* Photo upload */}
        <button
          className={styles.photoUpload}
          onClick={handleTossPhotoPickOrFallback}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleImageDrop}
          disabled={loading}
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
          capture="user"
          onChange={handleImageChange}
          disabled={loading}
          style={{ display: "none" }}
        />

        {/* Name */}
        <input
          className={styles.nameInput}
          placeholder="이름 (선택)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onCompositionEnd={(e) => setName((e.target as HTMLInputElement).value)}
          maxLength={30}
          disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
