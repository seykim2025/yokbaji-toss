import { useRef, useState } from "react";
import type { Personality, Gender, Character } from "../types";
import { createCharacter, assignSlotForCharacter } from "../api";
import { isTossWebView } from "../toss";
import MainFooterBannerAd from "./MainFooterBannerAd";
import styles from "./CreateScreen.module.css";

interface Props {
  tokens: number;
  isPaidSlot: boolean;
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

export default function CreateScreen({ tokens, isPaidSlot, onCreated, onCharge, onHome }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceError, setFaceError] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdChar, setCreatedChar] = useState<Character | null>(null);

  function handleTossPhotoPickOrFallback() {
    setShowPickerModal(true);
  }

  async function handleAlbumSelect() {
    if (isTossWebView()) {
      try {
        const sdk = await import("@apps-in-toss/web-framework");
        if (sdk.fetchAlbumPhotos) {
          const photos = await sdk.fetchAlbumPhotos({ maxCount: 1, maxWidth: 1024, base64: true });
          if (photos.length > 0) {
            const photo = photos[0];
            const file = await base64ToFile(photo.dataUri, "photo.jpg");
            setImage(file);
            setPreview(URL.createObjectURL(file));
            setShowPickerModal(false);
            return;
          }
        }
      } catch (err) {
        console.error("[CreateScreen] fetchAlbumPhotos failed:", err);
      }
    }
    if (fileRef.current) {
      fileRef.current.removeAttribute("capture");
      fileRef.current.click();
    }
    setShowPickerModal(false);
  }

  function handleCameraSelect() {
    if (fileRef.current) {
      fileRef.current.setAttribute("capture", "user");
      fileRef.current.click();
    }
    setShowPickerModal(false);
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

  function isFaceDetectionError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
      lower.includes("face") ||
      lower.includes("얼굴") ||
      lower.includes("no_face") ||
      lower.includes("no face") ||
      lower.includes("face_not") ||
      lower.includes("detection")
    );
  }

  async function handleSubmit() {
    if (!image || !personality || !gender || loading) return;
    setLoading(true);
    setError(null);
    setFaceError(false);
    try {
      let uploadFile = image;
      // If image is a blob: URL (from fetchAlbumPhotos with base64:false), re-fetch to File
      if (image.size === 0 && image.name === "photo.jpg") {
        // Already handled in handleTossPhotoPick, but guard here too
        uploadFile = await dataUriToFile(preview!, "photo.jpg");
      }
      console.log("[CreateScreen] creating character:", uploadFile.name, uploadFile.size, uploadFile.type);
      const character = await createCharacter(uploadFile, personality, gender, name);
      assignSlotForCharacter(character.id, isPaidSlot);
      setCreatedChar(character);
      setShowSuccess(true);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "캐릭터 생성 실패";
      console.error("[CreateScreen] createCharacter error:", rawMsg, err);
      if (isFaceDetectionError(rawMsg)) {
        setFaceError(true);
        setError("얼굴을 인식하지 못했어요. 얼굴이 정면을 향하고 잘 보이는 사진으로 다시 시도해주세요.");
      } else {
        setFaceError(false);
        setError(rawMsg);
      }
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
        <div className={styles.backBtn} style={{ visibility: "hidden", pointerEvents: "none" }} />
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

        {error && (
          <div>
            <p className={styles.error}>{error}</p>
            {faceError && (
              <button
                className={styles.retryPhotoBtn}
                onClick={() => { setPreview(null); setImage(null); setError(null); setFaceError(false); }}
              >
                📷 사진 다시 선택하기
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.submitArea}>
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
        <MainFooterBannerAd />
      </div>

      {showPickerModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", zIndex: 9999 }}
          onClick={() => setShowPickerModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 24px 40px", width: "100%", textAlign: "center", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: "#191f28", marginBottom: 20, marginTop: 0 }}>사진 업로드</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: "#f2f3f4", color: "#191f28", fontSize: 16, fontWeight: 600, border: "none" }}
                onClick={handleCameraSelect}
              >
                카메라로 촬영
              </button>
              <button
                style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: "#f2f3f4", color: "#191f28", fontSize: 16, fontWeight: 600, border: "none" }}
                onClick={handleAlbumSelect}
              >
                앨범에서 선택
              </button>
              <button
                style={{ width: "100%", padding: "14px 0", marginTop: 8, background: "transparent", color: "#6b7280", fontSize: 15, fontWeight: 500, border: "none" }}
                onClick={() => setShowPickerModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && createdChar && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "28px 24px 20px", width: "min(300px, 88vw)", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 18, fontWeight: 700, color: "#191f28", marginBottom: 12 }}>생성 완료!</p>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.5 }}>
              캐릭터가 생성되었습니다.<br />
              이제 캐릭터에게 말을 걸어<br />감정을 풀어보세요!
            </p>
            <button
              style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: "#3182f6", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer" }}
              onClick={() => {
                setShowSuccess(false);
                onCreated(createdChar);
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
