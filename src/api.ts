import type { Character, ReactionResult } from "./types";

export const API_BASE = import.meta.env.VITE_API_URL || "https://yokbaji-engine.vercel.app";

const LOCAL_CHAR_IDS_KEY = "yokbaji_character_ids";
const LOCAL_LAST_USED_KEY = "yokbaji_last_used";
const LOCAL_FREE_COUNT_KEY = "yokbaji_free_count";
export const FREE_LIMIT = 5;

export function getLastUsed(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_LAST_USED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function setLastUsed(characterId: string): void {
  const map = getLastUsed();
  map[characterId] = new Date().toISOString();
  localStorage.setItem(LOCAL_LAST_USED_KEY, JSON.stringify(map));
}

export function getFreeCount(characterId: string): number {
  try {
    const raw = localStorage.getItem(LOCAL_FREE_COUNT_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    return map[characterId] ?? 0;
  } catch { return 0; }
}

export function incrementFreeCount(characterId: string): number {
  try {
    const raw = localStorage.getItem(LOCAL_FREE_COUNT_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[characterId] = (map[characterId] ?? 0) + 1;
    localStorage.setItem(LOCAL_FREE_COUNT_KEY, JSON.stringify(map));
    return map[characterId];
  } catch { return 0; }
}

export function isFreeExhausted(characterId: string): boolean {
  return getFreeCount(characterId) >= FREE_LIMIT;
}

function getSavedCharacterIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_CHAR_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveCharacterId(id: string): void {
  const ids = getSavedCharacterIds();
  ids.add(id);
  localStorage.setItem(LOCAL_CHAR_IDS_KEY, JSON.stringify([...ids]));
}

export function deleteCharacterLocally(id: string): void {
  const ids = getSavedCharacterIds();
  ids.delete(id);
  localStorage.setItem(LOCAL_CHAR_IDS_KEY, JSON.stringify([...ids]));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCharacter(raw: any): Character {
  return {
    id: raw.character_id,
    name: raw.name || "Unnamed",
    personality_type: raw.personality_type,
    gender_type: raw.gender_type,
    image_path: raw.image_path,
    created_at: raw.created_at,
  };
}

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
  const raw = await res.json();
  const character = mapCharacter(raw);
  saveCharacterId(character.id);
  return character;
}

export async function listCharacters(): Promise<Character[]> {
  const savedIds = getSavedCharacterIds();
  if (savedIds.size === 0) return [];
  const res = await fetch(`${API_BASE}/api/characters`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.characters as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
    .filter((raw) => savedIds.has(raw.character_id))
    .map(mapCharacter);
}

export async function getCharacter(id: string): Promise<Character> {
  const res = await fetch(`${API_BASE}/api/characters/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  return mapCharacter(raw);
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
