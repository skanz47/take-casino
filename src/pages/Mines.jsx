import { useState, useEffect, useRef } from 'react'
import BetControls from '../components/BetControls'
import { getBalance, setBalance } from '../utils/balance'

const GRID_SIZE = 25 // 5x5

function generateMines(count) {
  const positions = new Set()
  while (positions.size < count) {
    positions.add(Math.floor(Math.random() * GRID_SIZE))
  }
  return positions
}

function calculateMultiplier(mineCount, revealed, houseEdge = 0.01) {
  // Probability-based multiplier with house edge
  // Each reveal: probability = (safeTilesLeft) / (totalTilesLeft)
  // Cumulative multiplier = 1 / (product of probabilities) * (1 - houseEdge)
  const totalTiles = GRID_SIZE
  const safeTiles = totalTiles - mineCount
  let probProduct = 1

  for (let i = 0; i < revealed; i++) {
    probProduct *= (safeTiles - i) / (totalTiles - i)
  }

  if (probProduct === 0) return 0
  return Math.floor((1 / probProduct) * (1 - houseEdge) * 100) / 100
}

export default function Mines({ balance, refreshBalance, addTransaction }) {
  const [bet, setBet] = useState('5.00')
  const [mineCount, setMineCount] = useState(3)
  const [phase, setPhase] = useState('setup') // setup, playing, busted, cashed
  const [mines, setMines] = useState(new Set())
  const [revealed, setRevealed] = useState(new Set())
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [activeBet, setActiveBet] = useState(0)
  const [endgameRevealed, setEndgameRevealed] = useState(new Set())
  const endgameTimers = useRef([])

  const startGame = () => {
    const numBet = parseFloat(bet)
    if (!numBet || numBet <= 0 || numBet > balance) return

    setBalance(getBalance() - numBet)
    refreshBalance()
    setActiveBet(numBet)
    setMines(generateMines(mineCount))
    setRevealed(new Set())
    setCurrentMultiplier(1)
    setPhase('playing')
  }

  // Stagger-reveal remaining tiles at game end
  const triggerEndgameReveal = (currentRevealed, currentMines) => {
    endgameTimers.current.forEach(t => clearTimeout(t))
    endgameTimers.current = []
    setEndgameRevealed(new Set())

    const unrevealed = []
    for (let i = 0; i < GRID_SIZE; i++) {
      if (!currentRevealed.has(i)) unrevealed.push(i)
    }
    // Reveal mines first, then safe tiles
    const minesFirst = unrevealed.filter(i => currentMines.has(i))
    const safeAfter = unrevealed.filter(i => !currentMines.has(i))
    const order = [...minesFirst, ...safeAfter]

    order.forEach((idx, i) => {
      const timer = setTimeout(() => {
        setEndgameRevealed(prev => {
          const next = new Set(prev)
          next.add(idx)
          return next
        })
      }, 80 + i * 50)
      endgameTimers.current.push(timer)
    })
  }

  useEffect(() => {
    return () => endgameTimers.current.forEach(t => clearTimeout(t))
  }, [])

  const revealTile = (index) => {
    if (phase !== 'playing' || revealed.has(index)) return

    if (mines.has(index)) {
      const newRevealed = new Set(revealed)
      newRevealed.add(index)
      setRevealed(newRevealed)
      addTransaction('Mines', -activeBet)
      setPhase('busted')
      triggerEndgameReveal(newRevealed, mines)
      return
    }

    const newRevealed = new Set(revealed)
    newRevealed.add(index)
    setRevealed(newRevealed)

    const newMult = calculateMultiplier(mineCount, newRevealed.size)
    setCurrentMultiplier(newMult)

    // Auto-win if all safe tiles revealed
    if (newRevealed.size === GRID_SIZE - mineCount) {
      const winnings = activeBet * newMult
      setBalance(getBalance() + winnings)
      refreshBalance()
      addTransaction('Mines', winnings - activeBet)
      setPhase('cashed')
      triggerEndgameReveal(newRevealed, mines)
    }
  }

  const cashOut = () => {
    if (phase !== 'playing' || revealed.size === 0) return
    const winnings = activeBet * currentMultiplier
    setBalance(getBalance() + winnings)
    refreshBalance()
    addTransaction('Mines', winnings - activeBet)
    setPhase('cashed')
    triggerEndgameReveal(revealed, mines)
  }

  const newGame = () => {
    endgameTimers.current.forEach(t => clearTimeout(t))
    setPhase('setup')
    setRevealed(new Set())
    setMines(new Set())
    setEndgameRevealed(new Set())
    setCurrentMultiplier(1)
  }

  const getTileContent = (index) => {
    if (revealed.has(index)) {
      return mines.has(index) ? '💣' : '💎'
    }
    if ((phase === 'busted' || phase === 'cashed') && endgameRevealed.has(index)) {
      return mines.has(index) ? '💣' : '💎'
    }
    return ''
  }

  const getTileClass = (index) => {
    if (revealed.has(index)) {
      if (mines.has(index)) return 'revealed mine'
      return 'revealed safe'
    }
    if ((phase === 'busted' || phase === 'cashed') && endgameRevealed.has(index)) {
      if (mines.has(index)) return 'revealed mine endgame-mine'
      return 'revealed hidden-safe'
    }
    return ''
  }

  const potentialWin = activeBet * currentMultiplier
  const nextMultiplier = phase === 'playing' ? calculateMultiplier(mineCount, revealed.size + 1) : currentMultiplier

  return (
    <div className="game-container">
      <h2 className="game-title">Mines</h2>

      <div className="mines-game">
        <div>
          <div className="mines-grid">
            {Array.from({ length: GRID_SIZE }, (_, i) => (
              <button
                key={i}
                className={`mines-tile ${getTileClass(i)}`}
                onClick={() => revealTile(i)}
                disabled={phase !== 'playing' || revealed.has(i)}
              >
                {getTileContent(i)}
              </button>
            ))}
          </div>
        </div>

        <div className="mines-panel">
          {phase === 'setup' && (
            <div className="mines-info">
              <BetControls bet={bet} setBet={setBet} balance={balance} />
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>
                Mines ({mineCount})
              </label>
              <select
                className="mines-select"
                value={mineCount}
                onChange={e => setMineCount(parseInt(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} mine{n > 1 ? 's' : ''}</option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                onClick={startGame}
                disabled={!parseFloat(bet) || parseFloat(bet) > balance}
              >
                Start Game
              </button>
            </div>
          )}

          {phase === 'playing' && (
            <div className="mines-info">
              <div className="mines-info-row">
                <span>Bet</span>
                <span>${activeBet.toFixed(2)}</span>
              </div>
              <div className="mines-info-row">
                <span>Mines</span>
                <span>{mineCount}</span>
              </div>
              <div className="mines-info-row">
                <span>Revealed</span>
                <span>{revealed.size}</span>
              </div>
              <div className="mines-info-row">
                <span>Multiplier</span>
                <span style={{ color: 'var(--accent)' }}>{currentMultiplier.toFixed(2)}×</span>
              </div>
              <div className="mines-info-row">
                <span>Next tile</span>
                <span style={{ color: 'var(--warning)' }}>{nextMultiplier.toFixed(2)}×</span>
              </div>
              <div className="mines-info-row" style={{ borderTop: '1px solid var(--bg-tertiary)', paddingTop: 8, marginTop: 4 }}>
                <span>Potential Win</span>
                <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>${potentialWin.toFixed(2)}</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 12 }}
                onClick={cashOut}
                disabled={revealed.size === 0}
              >
                Cash Out (${potentialWin.toFixed(2)})
              </button>
            </div>
          )}

          {phase === 'busted' && (
            <div className="mines-info">
              <div className="game-result lose">
                Hit a mine! Lost ${activeBet.toFixed(2)}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={newGame}>
                New Game
              </button>
            </div>
          )}

          {phase === 'cashed' && (
            <div className="mines-info">
              <div className="game-result win">
                Cashed out at {currentMultiplier.toFixed(2)}× — Won ${potentialWin.toFixed(2)}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={newGame}>
                New Game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
