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

const LOCAL_CHAR_IDS_KEY = "yokbaji_character_ids";
const LOCAL_LAST_USED_KEY = "yokbaji_last_used";
const LOCAL_FREE_COUNT_KEY = "yokbaji_free_count";
const LOCAL_SLOT_COUNT_KEY = "yokbaji_slot_count";
const LOCAL_CONVERSATIONS_KEY = "yokbaji_conversations";
const LOCAL_DEFAULT_IDS_KEY = "yokbaji_default_ids";
export const FREE_LIMIT = 5;
export const DEFAULT_SLOT_COUNT = 4;
export const SLOT_ADD_COST = 10;

// ── Default character protection ─────────────────────────────────────────────

export function markAsDefault(id: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_DEFAULT_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(LOCAL_DEFAULT_IDS_KEY, JSON.stringify(ids));
    }
  } catch { /* ignore */ }
}

export function isDefaultCharacter(id: string): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_DEFAULT_IDS_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(id);
  } catch { return false; }
}

// ── Slot management ──────────────────────────────────────────────────────────

export function getSlotCount(): number {
  try {
    const raw = localStorage.getItem(LOCAL_SLOT_COUNT_KEY);
    return raw ? parseInt(raw, 10) : DEFAULT_SLOT_COUNT;
  } catch { return DEFAULT_SLOT_COUNT; }
}

export function incrementSlotCount(): number {
  const next = getSlotCount() + 1;
  localStorage.setItem(LOCAL_SLOT_COUNT_KEY, String(next));
  return next;
}

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

export function getPaidCharacterIds(characters: Character[]): Set<string> {
  try {
    const raw = localStorage.getItem("yokbaji_paid_slot_assignments");
    const assignments: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    const paidIds = new Set<string>();
    let hasUpdates = false;
    let freeUsed = 0;

    const byCreation = [...characters].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const c of byCreation) {
      if (assignments[c.id] === undefined) {
        if (freeUsed < DEFAULT_SLOT_COUNT) {
          assignments[c.id] = false;
          freeUsed++;
        } else {
          assignments[c.id] = true;
        }
        hasUpdates = true;
      } else {
        if (!assignments[c.id]) freeUsed++;
      }
    }
    if (hasUpdates) {
      localStorage.setItem("yokbaji_paid_slot_assignments", JSON.stringify(assignments));
    }
    for (const c of characters) {
      if (assignments[c.id]) paidIds.add(c.id);
    }
    return paidIds;
  } catch {
    return new Set();
  }
}

export function assignSlotForCharacter(id: string, isPaid: boolean): void {
  try {
    const raw = localStorage.getItem("yokbaji_paid_slot_assignments");
    const assignments: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    assignments[id] = isPaid;
    localStorage.setItem("yokbaji_paid_slot_assignments", JSON.stringify(assignments));
  } catch { /* ignore */ }
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
