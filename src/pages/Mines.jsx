import { useState, useEffect, useRef } from 'react'
import BetControls from '../components/BetControls'
import { getBalance, setBalance } from '../utils/balance'

const GRID_SIZE = 25

function generateMines(count) {
  const positions = new Set()
  while (positions.size < count) {
    positions.add(Math.floor(Math.random() * GRID_SIZE))
  }
  return positions
}

function calculateMultiplier(mineCount, revealed, houseEdge = 0.01) {
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
  const [phase, setPhase] = useState('setup')
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

  const triggerEndgameReveal = (currentRevealed, currentMines) => {
    endgameTimers.current.forEach(t => clearTimeout(t))
    endgameTimers.current = []
    setEndgameRevealed(new Set())

    const unrevealed = []
    for (let i = 0; i < GRID_SIZE; i++) {
      if (!currentRevealed.has(i)) unrevealed.push(i)
    }
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
    const base = 'mines-tile w-16 h-16 bg-tertiary border-2 border-transparent rounded-lg cursor-pointer flex items-center justify-center text-2xl transition-all hover:bg-[#1e2d3a] hover:border-accent hover:scale-105 disabled:hover:scale-100 disabled:hover:bg-tertiary disabled:hover:border-transparent disabled:cursor-default'

    if (revealed.has(index)) {
      if (mines.has(index)) return `${base} revealed mine !bg-red-500/20 !border-danger`
      return `${base} revealed safe !bg-accent/15 !border-accent`
    }
    if ((phase === 'busted' || phase === 'cashed') && endgameRevealed.has(index)) {
      if (mines.has(index)) return `${base} revealed mine endgame-mine !bg-red-500/20 !border-danger`
      return `${base} revealed hidden-safe !bg-accent/5 !border-text-muted`
    }
    return base
  }

  const potentialWin = activeBet * currentMultiplier
  const nextMultiplier = phase === 'playing' ? calculateMultiplier(mineCount, revealed.size + 1) : currentMultiplier

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Mines</h2>

      <div className="flex gap-6 items-start flex-wrap">
        <div>
          <div className="grid grid-cols-5 gap-1.5 w-[350px]">
            {Array.from({ length: GRID_SIZE }, (_, i) => (
              <button
                key={i}
                className={getTileClass(i)}
                onClick={() => revealTile(i)}
                disabled={phase !== 'playing' || revealed.has(i)}
              >
                {getTileContent(i)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[240px]">
          {phase === 'setup' && (
            <div className="bg-secondary rounded-xl p-5">
              <BetControls bet={bet} setBet={setBet} balance={balance} />
              <label className="block text-sm text-text-secondary font-semibold mb-1">
                Mines ({mineCount})
              </label>
              <select
                className="bg-primary border-2 border-tertiary text-white px-3 py-2 rounded-lg text-sm w-full my-2 outline-none focus:border-accent"
                value={mineCount}
                onChange={e => setMineCount(parseInt(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} mine{n > 1 ? 's' : ''}</option>
                ))}
              </select>
              <button
                className="w-full mt-2 bg-accent hover:bg-accent-hover text-primary py-2.5 rounded-lg font-bold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={startGame}
                disabled={!parseFloat(bet) || parseFloat(bet) > balance}
              >
                Start Game
              </button>
            </div>
          )}

          {phase === 'playing' && (
            <div className="bg-secondary rounded-xl p-5">
              <div className="flex justify-between py-1.5 text-sm text-text-secondary">
                <span>Bet</span>
                <span className="text-white font-semibold">${activeBet.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-text-secondary">
                <span>Mines</span>
                <span className="text-white font-semibold">{mineCount}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-text-secondary">
                <span>Revealed</span>
                <span className="text-white font-semibold">{revealed.size}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-text-secondary">
                <span>Multiplier</span>
                <span className="text-accent font-semibold">{currentMultiplier.toFixed(2)}×</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-text-secondary">
                <span>Next tile</span>
                <span className="text-warning font-semibold">{nextMultiplier.toFixed(2)}×</span>
              </div>
              <div className="flex justify-between py-2 text-sm text-text-secondary border-t border-tertiary mt-2">
                <span>Potential Win</span>
                <span className="text-accent font-semibold text-base">${potentialWin.toFixed(2)}</span>
              </div>
              <button
                className="w-full mt-3 bg-accent hover:bg-accent-hover text-primary py-2.5 rounded-lg font-bold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={cashOut}
                disabled={revealed.size === 0}
              >
                Cash Out (${potentialWin.toFixed(2)})
              </button>
            </div>
          )}

          {phase === 'busted' && (
            <div className="bg-secondary rounded-xl p-5">
              <div className="p-3 rounded-lg font-semibold my-3 text-sm bg-red-500/10 text-danger border border-red-500/30">
                Hit a mine! Lost ${activeBet.toFixed(2)}
              </div>
              <button className="w-full mt-2 bg-accent hover:bg-accent-hover text-primary py-2.5 rounded-lg font-bold text-sm transition-colors border-none cursor-pointer" onClick={newGame}>
                New Game
              </button>
            </div>
          )}

          {phase === 'cashed' && (
            <div className="bg-secondary rounded-xl p-5">
              <div className="p-3 rounded-lg font-semibold my-3 text-sm bg-green-500/10 text-green-400 border border-green-500/30">
                Cashed out at {currentMultiplier.toFixed(2)}× — Won ${potentialWin.toFixed(2)}
              </div>
              <button className="w-full mt-2 bg-accent hover:bg-accent-hover text-primary py-2.5 rounded-lg font-bold text-sm transition-colors border-none cursor-pointer" onClick={newGame}>
                New Game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
