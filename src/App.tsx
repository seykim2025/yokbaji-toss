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
import { purchaseSlot, SLOT_ADD_COST } from "./api";
// Removed local coin.service imports
import { getTossUserKey, setScreenAwake, isTossWebView } from "./toss";
import { checkTossSession } from "./auth";
import { initAds } from "./lib/tossAds";
import type { TossUser } from "./auth";
import "./index.css";

const _t0 = performance.now();
console.log("[yokbaji] App module loaded:", _t0.toFixed(0) + "ms");

export const APP_VERSION = "v0.1.1";

// QA Reset Logic (removed destructive local wipe, server is source of truth)

export default function App() {
  const [screen, _setScreen] = useState<AppScreen | null>(null); // null = checking session
  const [userName, setUserName] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [prevScreen, setPrevScreen] = useState<AppScreen>("home");
  const [tokens, setTokens] = useState(0);
  const [freeSlots, setFreeSlots] = useState(2);
  const [paidSlots, setPaidSlots] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showCoinShortage, setShowCoinShortage] = useState(false);
  const [showSlotConfirm, setShowSlotConfirm] = useState(false);
  const [creatingInPaidSlot, setCreatingInPaidSlot] = useState(false);
  const [cachedCharacters, setCachedCharacters] = useState<Character[]>([]);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [debugLog, setDebugLog] = useState("");

  // Override setScreen to push state
  const setScreen = useCallback((newScreen: AppScreen, replace = false) => {
    if (replace) {
      window.history.replaceState({ screen: newScreen }, "", `?screen=${newScreen}`);
    } else {
      window.history.pushState({ screen: newScreen }, "", `?screen=${newScreen}`);
    }
    _setScreen(newScreen);
  }, []);

  // Listen for popstate
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state && state.screen) {
        _setScreen(state.screen);
      } else {
        // Fallback to home
        _setScreen("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // On mount: check session, then route to login or home
  useEffect(() => {

    checkTossSession().then((result) => {
      if (result.ok) {
        setUserName(result.user.name ?? null);
        console.log("[yokbaji] toss userKey:", result.user.userKey);
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const initialScreen = urlParams.get("screen") as AppScreen | null;
      
      if (result.ok) {
        setScreen(initialScreen ?? "home", true);
      } else {
        setScreen("login", true);
      }
    }).catch(() => {
      setScreen("login", true);
    });
  }, [setScreen]);

  // Initialize Toss SDK: user key + screen awake + ads
  useEffect(() => {
    getTossUserKey().then((key) => {
      console.log("[yokbaji] toss user key:", key);
    });
    setScreenAwake(true);
    initAds();
    return () => { setScreenAwake(false); };
  }, []);

  // Load user state from server after session check
  const loadUserState = useCallback(async () => {
    try {
      console.log("[yokbaji] fetchUserState start...");
      setDebugLog(prev => prev + "\nfetch start");
      const state = await import("./api").then(m => m.fetchUserState());
      console.log("[yokbaji] fetchUserState response:", state);
      setDebugLog(prev => prev + "\nfetch success, defaultChars.length=" + (state.defaultCharacters?.length ?? "undefined"));
      
      setTokens(state.coinBalance);
      setFreeSlots(state.freeSlotCount);
      setPaidSlots(state.paidSlotCount);
      
      const defaultCharsMapped = (state.defaultCharacters || []).map((c: any) => ({
        id: c.character_id,
        name: c.name || "Unnamed",
        personality_type: c.personality_type,
        gender_type: c.gender_type,
        image_path: c.image_path,
        created_at: c.created_at,
        slotType: c.slot_type || "default"
      }));
      
      const allChars = [...defaultCharsMapped, ...(state.characters || [])];
      console.log("[yokbaji] mergedCharacters:", allChars);
      setDebugLog(prev => prev + "\nmergedChars=" + allChars.length + ", tokens=" + state.coinBalance);
      
      setCachedCharacters(allChars);
    } catch (e: any) {
      console.error("[yokbaji] load state error:", e);
      setDebugLog(prev => prev + "\nhydration_error: " + e.message);
    } finally {
      setIsLoadingState(false);
    }
  }, []);

  useEffect(() => {
    if (screen && screen !== "login") {
      loadUserState();
    } else {
      setIsLoadingState(false);
    }
  }, [screen, loadUserState]);

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
    setScreen("home", true); // Replace login with home
  }, [setScreen]);

  const goHome = useCallback(() => {
    console.log("[yokbaji] return-to-home, cached chars:", cachedCharacters.length);
    setScreen("home");
    setCharacter(null);
  }, [cachedCharacters.length, setScreen]);

  const goToken = useCallback(() => {
    setPrevScreen(screen ?? "home");
    setScreen("token");
  }, [screen, setScreen]);

  const handleSelectCharacter = useCallback((c: Character) => {
    setCharacter(c);
    setScreen("character");
  }, [setScreen]);

  const handleCreated = useCallback((c: Character) => {
    setCharacter(c);
    setScreen("character", true); // Replace create with character
  }, [setScreen]);

  const handleAddSlotRequest = useCallback(() => {
    setShowSlotConfirm(true);
  }, []);

  const handleAddSlotConfirm = useCallback(async () => {
    setShowSlotConfirm(false);
    if (tokens < SLOT_ADD_COST) {
      setShowCoinShortage(true);
      return;
    }
    try {
      const res = await purchaseSlot();
      setTokens(res.coinBalance);
      setPaidSlots(res.paidSlotCount);
    } catch {
      // Handle error
    }
  }, [tokens]);

  const handleCoinsAdded = useCallback((amount: number) => {
    setTokens((t) => t + amount);
  }, []);

  if (screen === null || isLoadingState) {
    return null; // splash while checking session or loading state
  }

  const content = (() => {
    switch (screen) {
      case "login":
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
      case "home":
        return (
          <HomeScreen
            tokens={tokens}
            freeSlots={freeSlots}
            paidSlots={paidSlots}
            version={APP_VERSION}
            userName={userName}
            cachedCharacters={cachedCharacters}
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
            onTokenSpent={(amount) => {
              setTokens((t) => t - amount);
            }}
          />
        ) : null;
      case "token":
        return (
          <TokenPage
            onBack={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                setScreen(prevScreen);
              }
            }}
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
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.8)", color: "#0f0", fontSize: 10, zIndex: 9999, padding: 8, pointerEvents: "none", whiteSpace: "pre-wrap" }}>
        {debugLog}
      </div>
    </>
  );
}
