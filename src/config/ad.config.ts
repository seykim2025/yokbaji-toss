// user-facing unit: 코인
export const REWARDED_AD_COIN_AMOUNT = 5;
export const DAILY_REWARDED_AD_LIMIT = 3;
export const DAILY_REWARDED_COIN_LIMIT = 9;

// Ad group IDs — set via env vars; fall back to placeholder
export const BANNER_AD_GROUP_ID =
  import.meta.env.VITE_BANNER_AD_GROUP_ID ?? "main_footer_banner";

export const REWARDED_AD_GROUP_ID =
  import.meta.env.VITE_REWARDED_AD_GROUP_ID ?? "rewarded_coin";
