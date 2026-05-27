import { API_BASE, getUserKey } from "../api";

const DAILY_KEY = "yokbaji_rewarded_ad_daily";
const REWARDED_IDS_KEY = "yokbaji_rewarded_event_ids";

interface DailyRecord {
  date: string; // YYYY-MM-DD in Asia/Seoul
  count: number;
  coins: number;
}

function todayKST(): string {
  return new Date()
    .toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(".", "");
}

function getDaily(): DailyRecord {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { date: todayKST(), count: 0, coins: 0 };
    const rec: DailyRecord = JSON.parse(raw);
    if (rec.date !== todayKST()) return { date: todayKST(), count: 0, coins: 0 };
    return rec;
  } catch {
    return { date: todayKST(), count: 0, coins: 0 };
  }
}

function saveDaily(rec: DailyRecord): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify(rec));
}

function hasEventId(eventId: string): boolean {
  try {
    const raw = localStorage.getItem(REWARDED_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(eventId);
  } catch {
    return false;
  }
}

function recordEventId(eventId: string): void {
  try {
    const raw = localStorage.getItem(REWARDED_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    ids.push(eventId);
    // Keep last 100 only
    if (ids.length > 100) ids.splice(0, ids.length - 100);
    localStorage.setItem(REWARDED_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export type RewardResult =
  | { ok: true; coinsAdded: number; newBalance: number }
  | { ok: false; reason: "daily_limit" | "duplicate" | "error" };

export function canWatchRewardedAd(): { allowed: boolean; reason?: string } {
  // TODO: Add backend-configurable limit or soft-warning if abuse occurs.
  // For now, no hard daily limit is enforced.
  return { allowed: true };
}

export async function grantReward(eventId: string): Promise<RewardResult> {
  const daily = getDaily();

  if (hasEventId(eventId)) {
    return { ok: false, reason: "duplicate" };
  }

  try {
    const userKey = getUserKey();
    const res = await fetch(`${API_BASE}/api/users/me/coins/reward-ad`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-key": userKey },
      body: JSON.stringify({ adEventId: eventId, rewardAmount: 10 })
    });
    
    if (!res.ok) {
      if (res.status === 409) return { ok: false, reason: "duplicate" };
      return { ok: false, reason: "error" };
    }
    
    const data = await res.json();
    
    recordEventId(eventId);
    daily.count += 1;
    daily.coins += 10;
    saveDaily(daily);

    return { ok: true, coinsAdded: 10, newBalance: data.coinBalance };
  } catch (err) {
    console.error(err);
    return { ok: false, reason: "error" };
  }
}
