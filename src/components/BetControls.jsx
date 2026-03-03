export default function BetControls({ bet, setBet, balance, disabled }) {
  const handleChange = (e) => {
    const val = e.target.value
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setBet(val)
    }
  }

  const numBet = parseFloat(bet) || 0
  const btnClass = 'bg-tertiary text-text-secondary px-3 py-2 rounded-lg text-xs font-semibold hover:bg-accent hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer'

  return (
    <div className="flex items-center gap-2 mb-4">
      <label className="text-sm text-text-secondary font-semibold">Bet:</label>
      <input
        className="bg-primary border-2 border-tertiary text-white px-3 py-2 rounded-lg text-base w-28 outline-none focus:border-accent transition-colors"
        type="text"
        value={bet}
        onChange={handleChange}
        disabled={disabled}
        placeholder="0.00"
      />
      <button className={btnClass} disabled={disabled} onClick={() => setBet(Math.max(0.01, numBet / 2).toFixed(2))}>½</button>
      <button className={btnClass} disabled={disabled} onClick={() => setBet(Math.min(balance, numBet * 2).toFixed(2))}>2×</button>
      <button className={btnClass} disabled={disabled} onClick={() => setBet(balance.toFixed(2))}>Max</button>
    </div>
  )
}
