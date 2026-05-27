// user-facing name: 코인
// internal balance unit: coin (same as token in other parts of the codebase)

const COIN_BALANCE_KEY = "yokbaji_coin_balance";
const INITIAL_COIN_BALANCE = 5;

export function getCoinBalance(): number {
  const raw = localStorage.getItem(COIN_BALANCE_KEY);
  if (raw === null) return INITIAL_COIN_BALANCE;
  const n = parseInt(raw, 10);
  return isNaN(n) ? INITIAL_COIN_BALANCE : n;
}

export function setCoinBalance(amount: number): void {
  localStorage.setItem(COIN_BALANCE_KEY, String(Math.max(0, amount)));
}

export function addCoins(amount: number): number {
  const next = getCoinBalance() + amount;
  setCoinBalance(next);
  return next;
}

export function spendCoins(amount: number): boolean {
  const balance = getCoinBalance();
  if (balance < amount) return false;
  setCoinBalance(balance - amount);
  return true;
}
