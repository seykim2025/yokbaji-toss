import { useState, useCallback, useEffect } from "react";
import type { AppScreen, Character } from "./types";
import HomeScreen from "./components/HomeScreen";
import CreateScreen from "./components/CreateScreen";
import CharacterPage from "./components/CharacterPage";
import TokenPage from "./components/TokenPage";
import ExitModal from "./components/ExitModal";
import LoginScreen from "./components/LoginScreen";
import { createCharacter, getSlotCount, incrementSlotCount, SLOT_ADD_COST } from "./api";
import { getTossUserKey, setScreenAwake, isTossWebView } from "./toss";
import { checkTossSession } from "./auth";
import type { TossUser } from "./auth";
import "./index.css";

export const APP_VERSION = "v0.0.3";
const INITIAL_TOKENS = 100;
const DEFAULTS_V2_KEY = "yokbaji_defaults_v2_seeded";
const SEED_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_SEED_DEFAULTS === "true";

async function seedDefaultCharacters(): Promise<void> {
  if (!SEED_ENABLED) return;
  if (localStorage.getItem(DEFAULTS_V2_KEY)) return;
  try {
    // Clear previous defaults so fresh images are used
    localStorage.removeItem("yokbaji_character_ids");
    localStorage.removeItem("yokbaji_defaults_seeded");

    const [blob1, blob2] = await Promise.all([
      fetch("/girl.jpeg").then((r) => r.blob()),
      fetch("/man.jpeg").then((r) => r.blob()),
    ]);
    const img1 = new File([blob1], "girl.jpeg", { type: "image/jpeg" });
    const img2 = new File([blob2], "man.jpeg", { type: "image/jpeg" });

    await Promise.all([
      createCharacter(img1, "WEAK", "F", "온순이"),
      createCharacter(img2, "ANGRY", "M", "버럭이"),
    ]);
    localStorage.setItem(DEFAULTS_V2_KEY, "1");
  } catch {
    // will retry next load
  }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen | null>(null); // null = checking session
  const [userName, setUserName] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [prevScreen, setPrevScreen] = useState<AppScreen>("home");
  const [tokens, setTokens] = useState(INITIAL_TOKENS);
  const [totalSlots, setTotalSlots] = useState(() => getSlotCount());
  const [showExitModal, setShowExitModal] = useState(false);

  // On mount: check session, then route to login or home
  useEffect(() => {
    checkTossSession().then((result) => {
      if (result.ok) {
        setUserName(result.user.name ?? null);
        console.log("[yokbaji] toss userKey:", result.user.userKey);
      }
      setScreen(result.ok ? "home" : "login");
    }).catch(() => {
      setScreen("login");
    });
  }, []);

  // Initialize Toss SDK: user key + screen awake
  useEffect(() => {
    getTossUserKey().then((key) => {
      console.log("[yokbaji] toss user key:", key);
    });
    setScreenAwake(true);
    return () => { setScreenAwake(false); };
  }, []);

  useEffect(() => { seedDefaultCharacters(); }, []);

  // Listen for Toss WebView close (X button) — show exit confirmation
  useEffect(() => {
    if (!isTossWebView()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emitter = (window as any).__GRANITE_NATIVE_EMITTER as
      | { on: (event: string, cb: () => void) => () => void }
      | undefined;
    if (emitter?.on) {
      return emitter.on("closeView", () => setShowExitModal(true));
    }
  }, []);

  const handleLoginSuccess = useCallback((user: TossUser) => {
    setUserName(user.name ?? null);
    setScreen("home");
  }, []);

  const goHome = useCallback(() => {
    setScreen("home");
    setCharacter(null);
  }, []);

  const goToken = useCallback(() => {
    setPrevScreen(screen ?? "home");
    setScreen("token");
  }, [screen]);

  const handleSelectCharacter = useCallback((c: Character) => {
    setCharacter(c);
    setScreen("character");
  }, []);

  const handleCreated = useCallback((c: Character) => {
    setCharacter(c);
    setScreen("character");
  }, []);

  const handleAddSlot = useCallback(() => {
    if (tokens < SLOT_ADD_COST) {
      goToken();
      return;
    }
    setTokens((t) => t - SLOT_ADD_COST);
    const next = incrementSlotCount();
    setTotalSlots(next);
  }, [tokens, goToken]);

  if (screen === null) {
    return null; // splash while checking session
  }

  const content = (() => {
    switch (screen) {
      case "login":
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
      case "home":
        return (
          <HomeScreen
            tokens={tokens}
            totalSlots={totalSlots}
            version={APP_VERSION}
            userName={userName}
            onCreateNew={() => setScreen("create")}
            onSelectCharacter={handleSelectCharacter}
            onAddSlot={handleAddSlot}
            onCharge={goToken}
          />
        );
      case "create":
        return (
          <CreateScreen
            tokens={tokens}
            onBack={goHome}
            onCreated={handleCreated}
            onCharge={goToken}
            onHome={goHome}
          />
        );
      case "character":
        return character ? (
          <CharacterPage
            character={character}
            tokens={tokens}
            onBack={goHome}
            onHome={goHome}
            onCharge={goToken}
          />
        ) : null;
      case "token":
        return (
          <TokenPage onBack={() => setScreen(prevScreen)} />
        );
    }
  })();

  return (
    <>
      {content}
      <ExitModal open={showExitModal} onClose={() => setShowExitModal(false)} />
    </>
  );
}
