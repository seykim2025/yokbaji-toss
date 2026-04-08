import { useState, useCallback, useEffect } from "react";
import type { AppScreen, Character } from "./types";
import HomeScreen from "./components/HomeScreen";
import CreateScreen from "./components/CreateScreen";
import CharacterPage from "./components/CharacterPage";
import TokenPage from "./components/TokenPage";
import { createCharacter } from "./api";
import "./index.css";

const MOCK_TOKENS = 100;
const DEFAULTS_SEEDED_KEY = "yokbaji_defaults_seeded";

function makeAvatarBlob(color: string, label: string): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 80px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 100, 108);
    canvas.toBlob((blob) => {
      resolve(new File([blob!], "avatar.png", { type: "image/png" }));
    }, "image/png");
  });
}

async function seedDefaultCharacters(): Promise<void> {
  if (localStorage.getItem(DEFAULTS_SEEDED_KEY)) return;
  try {
    const [img1, img2] = await Promise.all([
      makeAvatarBlob("#60a5fa", "온"),
      makeAvatarBlob("#ef4444", "버"),
    ]);
    await Promise.all([
      createCharacter(img1, "WEAK", "F", "온순이"),
      createCharacter(img2, "ANGRY", "M", "버럭이"),
    ]);
    localStorage.setItem(DEFAULTS_SEEDED_KEY, "1");
  } catch {
    // will retry next load
  }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [character, setCharacter] = useState<Character | null>(null);
  const [prevScreen, setPrevScreen] = useState<AppScreen>("home");
  const [tokens] = useState(MOCK_TOKENS);

  useEffect(() => { seedDefaultCharacters(); }, []);

  const goHome = useCallback(() => {
    setScreen("home");
    setCharacter(null);
  }, []);

  const goToken = useCallback(() => {
    setPrevScreen(screen);
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

  switch (screen) {
    case "home":
      return (
        <HomeScreen
          tokens={tokens}
          onCreateNew={() => setScreen("create")}
          onSelectCharacter={handleSelectCharacter}
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
}
