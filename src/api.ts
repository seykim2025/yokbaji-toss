import type { Character, ReactionResult } from "./types";

export const API_BASE = import.meta.env.VITE_API_URL || "https://yokbaji-engine.vercel.app";

export async function exchangeAuthCode(
  authorizationCode: string,
  referrer: string
): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/toss-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizationCode, referrer }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.userKey === "number" ? data.userKey : null;
  } catch {
    return null;
  }
}

const LOCAL_LAST_USED_KEY = "yokbaji_last_used";
const LOCAL_FREE_COUNT_KEY = "yokbaji_free_count";
const LOCAL_CONVERSATIONS_KEY = "yokbaji_conversations";
export const FREE_LIMIT = 5;
export const DEFAULT_SLOT_COUNT = 4;
export const SLOT_ADD_COST = 10;

export function getUserKey(): string {
  try {
    const raw = localStorage.getItem("yokbaji_session_user");
    if (!raw) return "";
    return JSON.parse(raw).userKey || "";
  } catch {
    return "";
  }
}

export interface UserState {
  userKey: string;
  coinBalance: number;
  freeSlotCount: number;
  paidSlotCount: number;
  characters: Character[];
  defaultCharacters: string[];
}

export async function fetchUserState(): Promise<UserState> {
  const userKey = getUserKey();
  if (!userKey) throw new Error("Not logged in");

  const res = await fetch(`${API_BASE}/api/users/me/state`, {
    headers: { "x-user-key": userKey }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error("Failed to fetch user state") as any;
    err.status = res.status;
    err.bodySnippet = text.substring(0, 100);
    throw err;
  }
  
  const raw = await res.json();
  return {
    ...raw,
    characters: raw.characters.map(mapCharacter)
  };
}

export async function purchaseSlot(): Promise<{ paidSlotCount: number; coinBalance: number }> {
  const userKey = getUserKey();
  const res = await fetch(`${API_BASE}/api/users/me/slots/purchase`, {
    method: "POST",
    headers: { "x-user-key": userKey }
  });
  if (!res.ok) throw new Error("Failed to purchase slot");
  return res.json();
}

export async function spendConversationCoin(): Promise<{ success: boolean; coinBalance: number }> {
  const userKey = getUserKey();
  const res = await fetch(`${API_BASE}/api/users/me/coins/spend-conversation`, {
    method: "POST",
    headers: { "x-user-key": userKey }
  });
  if (!res.ok) throw new Error("Failed to spend coin");
  return res.json();
}

// ── Default character protection ─────────────────────────────────────────────

// Removed local default/slot tracking

// ── Conversation history ──────────────────────────────────────────────────────

export interface ConversationRecord {
  id: string;
  characterId: string;
  userMessage: string;
  dialogue: string | string[];
  videoUrl: string | null;
  timestamp: string;
}

export function saveConversation(
  characterId: string,
  userMessage: string,
  dialogue: string | string[],
  videoUrl: string | null
): void {
  try {
    const record: ConversationRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      characterId,
      userMessage,
      dialogue,
      videoUrl,
      timestamp: new Date().toISOString(),
    };
    const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
    const all: ConversationRecord[] = raw ? JSON.parse(raw) : [];
    const others = all.filter((r) => r.characterId !== characterId);
    const mine = all.filter((r) => r.characterId === characterId);
    mine.push(record);
    // keep at most 100 per character
    localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify([...others, ...mine.slice(-100)]));
  } catch { /* ignore */ }
}

export function getConversations(characterId: string): ConversationRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
    const all: ConversationRecord[] = raw ? JSON.parse(raw) : [];
    return all
      .filter((r) => r.characterId === characterId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch { return []; }
}

export function deleteConversations(characterId: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
    const all: ConversationRecord[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(all.filter((r) => r.characterId !== characterId)));
  } catch { /* ignore */ }
}

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

// Removed local character IDs and paid slot assignments

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCharacter(raw: any): Character {
  return {
    id: raw.character_id,
    name: raw.name || "Unnamed",
    personality_type: raw.personality_type,
    gender_type: raw.gender_type,
    image_path: raw.image_path,
    created_at: raw.created_at,
    slotType: raw.slot_type,
  };
}

export async function createCharacter(
  image: File,
  personalityType: string,
  genderType: string,
  name: string,
  slotType: "free" | "paid" | "default" = "free",
  slotIndex: number = 0
): Promise<Character> {
  const form = new FormData();
  form.append("image", image);
  form.append("personality_type", personalityType);
  form.append("gender_type", genderType);
  form.append("name", name);
  form.append("slot_type", slotType);
  form.append("slot_index", String(slotIndex));

  const userKey = getUserKey();

  const res = await fetch(`${API_BASE}/api/characters`, {
    method: "POST",
    headers: { "x-user-key": userKey },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const raw = await res.json();
  const character = mapCharacter(raw);
  return character;
}

export async function listCharacters(): Promise<Character[]> {
  const state = await fetchUserState();
  return state.characters;
}

export async function getCharacter(id: string): Promise<Character> {
  const res = await fetch(`${API_BASE}/api/characters/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  return mapCharacter(raw);
}

export async function generateReaction(
  characterId: string,
  userMessage: string,
  recentDialogueIds?: string[],
  recentBaseAssetCodes?: string[],
): Promise<ReactionResult> {
  const res = await fetch(`${API_BASE}/api/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      character_id: characterId,
      user_text: userMessage,
      user_message: userMessage,
      recent_dialogue_ids: recentDialogueIds ?? [],
      recent_base_asset_codes: recentBaseAssetCodes ?? [],
    }),
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
