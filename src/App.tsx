import { useState, useCallback } from "react";
import type { AppScreen, Character, ReactionResult } from "./types";
import { getCharacter } from "./api";
import HomeScreen from "./components/HomeScreen";
import CreateScreen from "./components/CreateScreen";
import ChatScreen from "./components/ChatScreen";
import ReactionScreen from "./components/ReactionScreen";
import "./index.css";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [character, setCharacter] = useState<Character | null>(null);
  const [reaction, setReaction] = useState<ReactionResult | null>(null);

  const goHome = useCallback(() => {
    setScreen("home");
    setCharacter(null);
    setReaction(null);
  }, []);

  const handleSelectCharacter = useCallback((c: Character) => {
    setCharacter(c);
    setScreen("chat");
  }, []);

  const handleCreated = useCallback(async (characterId: string) => {
    const c = await getCharacter(characterId);
    setCharacter(c);
    setScreen("chat");
  }, []);

  const handleReaction = useCallback((result: ReactionResult) => {
    setReaction(result);
    setScreen("reaction");
  }, []);

  const handleAgain = useCallback(() => {
    setReaction(null);
    setScreen("chat");
  }, []);

  switch (screen) {
    case "home":
      return (
        <HomeScreen
          onCreateNew={() => setScreen("create")}
          onSelectCharacter={handleSelectCharacter}
        />
      );
    case "create":
      return (
        <CreateScreen
          onBack={goHome}
          onCreated={handleCreated}
        />
      );
    case "chat":
      return character ? (
        <ChatScreen
          character={character}
          onBack={goHome}
          onReaction={handleReaction}
        />
      ) : null;
    case "reaction":
      return reaction ? (
        <ReactionScreen
          result={reaction}
          onAgain={handleAgain}
          onHome={goHome}
        />
      ) : null;
  }
}
