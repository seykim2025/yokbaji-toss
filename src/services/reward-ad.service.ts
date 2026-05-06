import {
  REWARDED_AD_COIN_AMOUNT,
  DAILY_REWARDED_AD_LIMIT,
  DAILY_REWARDED_COIN_LIMIT,
} from "../config/ad.config";
import { addCoins } from "./coin.service";

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
  const daily = getDaily();
  if (daily.count >= DAILY_REWARDED_AD_LIMIT) {
    return {
      allowed: false,
      reason: `오늘 받을 수 있는 광고 보상 코인을 모두 받았어요. (${daily.coins}/${DAILY_REWARDED_COIN_LIMIT} 코인)`,
    };
  }
  return { allowed: true };
}

export function grantReward(eventId: string): RewardResult {
  const daily = getDaily();

  if (daily.count >= DAILY_REWARDED_AD_LIMIT || daily.coins >= DAILY_REWARDED_COIN_LIMIT) {
    return { ok: false, reason: "daily_limit" };
  }

  if (hasEventId(eventId)) {
    return { ok: false, reason: "duplicate" };
  }

  const newBalance = addCoins(REWARDED_AD_COIN_AMOUNT);
  recordEventId(eventId);

  daily.count += 1;
  daily.coins += REWARDED_AD_COIN_AMOUNT;
  saveDaily(daily);

  return { ok: true, coinsAdded: REWARDED_AD_COIN_AMOUNT, newBalance };
}
