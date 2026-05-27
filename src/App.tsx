import { useState, useCallback, useEffect } from "react";
import type { AppScreen, Character } from "./types";
import HomeScreen from "./components/HomeScreen";
import CreateScreen from "./components/CreateScreen";
import CharacterPage from "./components/CharacterPage";
import TokenPage from "./components/TokenPage";
import ExitModal from "./components/ExitModal";
import LoginScreen from "./components/LoginScreen";
import CoinShortageModal from "./components/CoinShortageModal";
import ConfirmModal from "./components/ConfirmModal";
import { getSlotCount, incrementSlotCount, SLOT_ADD_COST, createCharacter, markAsDefault } from "./api";
import { getCoinBalance, spendCoins } from "./services/coin.service";
import { getTossUserKey, setScreenAwake, isTossWebView } from "./toss";
import { checkTossSession } from "./auth";
import { initAds } from "./lib/tossAds";
import type { TossUser } from "./auth";
import "./index.css";

const _t0 = performance.now();
console.log("[yokbaji] App module loaded:", _t0.toFixed(0) + "ms");

export const APP_VERSION = "v0.0.9";

// v0.0.8 Reset Logic
const RESET_V8_KEY = "yokbaji_reset_v8_2";
if (!localStorage.getItem(RESET_V8_KEY)) {
  localStorage.removeItem("yokbaji_character_ids");
  localStorage.removeItem("yokbaji_paid_slot_assignments");
  localStorage.removeItem("yokbaji_slot_count");
  localStorage.removeItem("yokbaji_default_ids");
  localStorage.removeItem("yokbaji_conversations");
  localStorage.removeItem("yokbaji_last_used");
  localStorage.removeItem("yokbaji_free_count");
  localStorage.setItem("yokbaji_coin_balance", "5");
  localStorage.setItem(RESET_V8_KEY, "1");
}

async function seedDefaultCharacter(): Promise<void> {
  if (localStorage.getItem("yokbaji_seed_v8_2")) return;
  try {
    const res1 = await fetch("/girl.jpeg");
    if (res1.ok) {
      const blob1 = await res1.blob();
      const img1 = new File([blob1], "girl.jpeg", { type: "image/jpeg" });
      const c1 = await createCharacter(img1, "WEAK", "F", "온순이");
      markAsDefault(c1.id);
    }

    const res2 = await fetch("/man.jpeg");
    if (res2.ok) {
      const blob2 = await res2.blob();
      const img2 = new File([blob2], "man.jpeg", { type: "image/jpeg" });
      const c2 = await createCharacter(img2, "ANGRY", "M", "버럭이");
      markAsDefault(c2.id);
    }

    localStorage.setItem("yokbaji_seed_v8_2", "1");
  } catch (err) {
    console.error("[yokbaji] seed error:", err);
  }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen | null>(null); // null = checking session
  const [userName, setUserName] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [prevScreen, setPrevScreen] = useState<AppScreen>("home");
  const [tokens, setTokens] = useState(() => getCoinBalance());
  const [totalSlots, setTotalSlots] = useState(() => getSlotCount());
  const [showExitModal, setShowExitModal] = useState(false);
  const [showCoinShortage, setShowCoinShortage] = useState(false);
  const [showSlotConfirm, setShowSlotConfirm] = useState(false);
  const [creatingInPaidSlot, setCreatingInPaidSlot] = useState(false);
  const [cachedCharacters, setCachedCharacters] = useState<Character[]>([]);
  const [isSeeding, setIsSeeding] = useState(true);

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

  // Initialize Toss SDK: user key + screen awake + ads
  useEffect(() => {
    getTossUserKey().then((key) => {
      console.log("[yokbaji] toss user key:", key);
    });
    setScreenAwake(true);
    initAds();
    return () => { setScreenAwake(false); };
  }, []);

  useEffect(() => {
    seedDefaultCharacter().finally(() => setIsSeeding(false));
  }, []);



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
    console.log("[yokbaji] return-to-home, cached chars:", cachedCharacters.length);
    setScreen("home");
    setCharacter(null);
  }, [cachedCharacters.length]);

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

  const handleAddSlotRequest = useCallback(() => {
    setShowSlotConfirm(true);
  }, []);

  const handleAddSlotConfirm = useCallback(() => {
    setShowSlotConfirm(false);
    if (tokens < SLOT_ADD_COST) {
      setShowCoinShortage(true);
      return;
    }
    if (spendCoins(SLOT_ADD_COST)) {
      setTokens(getCoinBalance());
      const next = incrementSlotCount();
      setTotalSlots(next);
    }
  }, [tokens]);

  const handleCoinsAdded = useCallback((amount: number) => {
    setTokens((t) => t + amount);
  }, []);

  if (screen === null || isSeeding) {
    return null; // splash while checking session or seeding
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
            cachedCharacters={cachedCharacters}
            onCharactersLoaded={setCachedCharacters}
            onCreateNew={(isPaid) => {
              setCreatingInPaidSlot(isPaid);
              setScreen("create");
            }}
            onSelectCharacter={handleSelectCharacter}
            onAddSlot={handleAddSlotRequest}
            onCharge={goToken}
          />
        );
      case "create":
        return (
          <CreateScreen
            tokens={tokens}
            isPaidSlot={creatingInPaidSlot}
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
          <TokenPage
            onBack={() => setScreen(prevScreen)}
            onCoinsAdded={handleCoinsAdded}
          />
        );
    }
  })();

  return (
    <>
      {content}
      <ExitModal open={showExitModal} onClose={() => setShowExitModal(false)} />
      <CoinShortageModal
        open={showCoinShortage}
        onClose={() => setShowCoinShortage(false)}
        onCoinsAdded={handleCoinsAdded}
      />
      <ConfirmModal
        open={showSlotConfirm}
        title="슬롯 추가"
        message="10 코인을 사용하여 새 캐릭터 슬롯을 추가하시겠습니까?"
        onConfirm={handleAddSlotConfirm}
        onCancel={() => setShowSlotConfirm(false)}
      />
    </>
  );
}
