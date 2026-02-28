const TX_KEY = 'casino_transactions'

export function getTransactions() {
  try {
    return JSON.parse(localStorage.getItem(TX_KEY)) || []
  } catch {
    return []
  }
}

export function addTransaction(game, amount) {
  const txs = getTransactions()
  txs.unshift({ game, amount, time: Date.now() })
  if (txs.length > 50) txs.length = 50
  localStorage.setItem(TX_KEY, JSON.stringify(txs))
}

export function clearTransactions() {
  localStorage.removeItem(TX_KEY)
}
