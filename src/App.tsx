import { useState, useCallback } from "react";
import type { AppScreen, Character } from "./types";
import HomeScreen from "./components/HomeScreen";
import CreateScreen from "./components/CreateScreen";
import CharacterPage from "./components/CharacterPage";
import TokenPage from "./components/TokenPage";
import "./index.css";

const MOCK_TOKENS = 100;

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [character, setCharacter] = useState<Character | null>(null);
  const [prevScreen, setPrevScreen] = useState<AppScreen>("home");
  const [tokens] = useState(MOCK_TOKENS);

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
