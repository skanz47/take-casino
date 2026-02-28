const BALANCE_KEY = 'casino_balance';
const DEFAULT_BALANCE = 100;

export function getBalance() {
  const stored = localStorage.getItem(BALANCE_KEY);
  if (stored === null) {
    setBalance(DEFAULT_BALANCE);
    return DEFAULT_BALANCE;
  }
  return parseFloat(stored);
}

export function setBalance(amount) {
  localStorage.setItem(BALANCE_KEY, amount.toFixed(2));
}

export function addBalance(amount) {
  const current = getBalance();
  setBalance(current + amount);
  return current + amount;
}

export function subtractBalance(amount) {
  const current = getBalance();
  const newBalance = Math.max(0, current - amount);
  setBalance(newBalance);
  return newBalance;
}

export function resetBalance() {
  setBalance(DEFAULT_BALANCE);
  return DEFAULT_BALANCE;
}
