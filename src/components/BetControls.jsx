export default function BetControls({ bet, setBet, balance, disabled }) {
  const handleChange = (e) => {
    const val = e.target.value
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setBet(val)
    }
  }

  const numBet = parseFloat(bet) || 0

  return (
    <div className="bet-controls">
      <label>Bet:</label>
      <input
        className="bet-input"
        type="text"
        value={bet}
        onChange={handleChange}
        disabled={disabled}
        placeholder="0.00"
      />
      <button className="bet-btn" disabled={disabled} onClick={() => setBet(Math.max(0.01, numBet / 2).toFixed(2))}>½</button>
      <button className="bet-btn" disabled={disabled} onClick={() => setBet(Math.min(balance, numBet * 2).toFixed(2))}>2×</button>
      <button className="bet-btn" disabled={disabled} onClick={() => setBet(balance.toFixed(2))}>Max</button>
    </div>
  )
}
