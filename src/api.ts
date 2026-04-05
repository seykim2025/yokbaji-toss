import type { Character, ReactionResult } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "https://yokbaji-engine.vercel.app";

export async function createCharacter(
  image: File,
  personalityType: string,
  genderType: string,
  name: string
): Promise<Character> {
  const form = new FormData();
  form.append("image", image);
  form.append("personality_type", personalityType);
  form.append("gender_type", genderType);
  form.append("name", name);

  const res = await fetch(`${API_BASE}/api/characters`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listCharacters(): Promise<Character[]> {
  const res = await fetch(`${API_BASE}/api/characters`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.characters;
}

export async function getCharacter(id: string): Promise<Character> {
  const res = await fetch(`${API_BASE}/api/characters/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function generateReaction(
  characterId: string,
  userMessage: string
): Promise<ReactionResult> {
  const res = await fetch(`${API_BASE}/api/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_id: characterId, user_message: userMessage }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  // Resolve relative video URLs
  if (data.video_url && !data.video_url.startsWith("http")) {
    data.video_url = `${API_BASE}${data.video_url}`;
  }
  return data;
}
