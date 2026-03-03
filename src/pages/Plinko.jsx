import { useState, useRef, useCallback, useEffect } from 'react'
import BetControls from '../components/BetControls'
import { getBalance, setBalance } from '../utils/balance'

const MULTIPLIERS = {
  8: {
    Low:    [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    Medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    High:   [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    Low:    [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    Medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    High:   [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    Low:    [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    Medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    High:   [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
}

function getSlotColors(rows) {
  const count = rows + 1
  const colors = []
  for (let i = 0; i < count; i++) {
    const ratio = i / (count - 1)
    const dist = Math.abs(ratio - 0.5) * 2
    if (dist > 0.7) colors.push('#ed4163')
    else if (dist > 0.5) colors.push('#e8593d')
    else if (dist > 0.3) colors.push('#e0712a')
    else if (dist > 0.1) colors.push('#d48a2a')
    else colors.push('#c9a32a')
  }
  return colors
}

const CANVAS_W = 500
const CANVAS_H = 420
const PEG_RADIUS = 3
const BALL_RADIUS = 7
const PAD_X = 40
const PAD_TOP = 25
const PAD_BOTTOM = 35

export default function Plinko({ balance, refreshBalance, addTransaction }) {
  const [bet, setBet] = useState('5.00')
  const [rows, setRows] = useState(12)
  const [risk, setRisk] = useState('Medium')
  const [lastResult, setLastResult] = useState(null)
  const [hitSlots, setHitSlots] = useState([])
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const ballsRef = useRef([])
  const ballIdCounter = useRef(0)

  const multipliers = MULTIPLIERS[rows][risk]
  const slotColors = getSlotColors(rows)

  const computePath = useCallback((path, numRows) => {
    const rowHeight = (CANVAS_H - PAD_TOP - PAD_BOTTOM) / numRows
    const positions = []
    let currentSlot = 0

    positions.push({ x: CANVAS_W / 2, y: PAD_TOP - 20 })

    for (let row = 0; row < numRows; row++) {
      if (path[row]) currentSlot++

      const nextPegsInRow = row + 4
      const nextRowWidth = (CANVAS_W - PAD_X * 2) * ((row + 4) / (numRows + 2))
      const nextStartX = (CANVAS_W - nextRowWidth) / 2
      const nextSpacing = nextRowWidth / (nextPegsInRow - 1)

      const x = nextStartX + currentSlot * nextSpacing
      const y = PAD_TOP + (row + 0.8) * rowHeight

      positions.push({ x, y })
    }

    const slotCount = numRows + 1
    const finalRowWidth = CANVAS_W - PAD_X * 2
    const finalSpacing = finalRowWidth / (slotCount - 1)
    const slot = currentSlot
    positions.push({ x: PAD_X + slot * finalSpacing, y: CANVAS_H - PAD_BOTTOM + 12 })

    return { positions, slot }
  }, [])

  const drawBoard = useCallback((activeBalls = []) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    const rowHeight = (CANVAS_H - PAD_TOP - PAD_BOTTOM) / rows

    for (let row = 0; row < rows; row++) {
      const pegsInRow = row + 3
      const rowWidth = (CANVAS_W - PAD_X * 2) * ((row + 3) / (rows + 2))
      const startX = (CANVAS_W - rowWidth) / 2
      const spacing = rowWidth / (pegsInRow - 1)

      for (let peg = 0; peg < pegsInRow; peg++) {
        const x = startX + peg * spacing
        const y = PAD_TOP + row * rowHeight
        ctx.beginPath()
        ctx.arc(x, y, PEG_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = '#4a5568'
        ctx.fill()
      }
    }

    for (const ball of activeBalls) {
      ctx.beginPath()
      ctx.arc(ball.x + 2, ball.y + 2, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fill()

      const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_RADIUS)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(1, '#b0b0b0')
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = 'rgba(0, 231, 1, 0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }, [rows])

  useEffect(() => {
    drawBoard()
  }, [rows, drawBoard])

  const startRenderLoop = useCallback(() => {
    if (animRef.current) return

    const loop = () => {
      const now = Date.now()
      const currentBalls = ballsRef.current
      const renderPositions = []

      for (const ball of currentBalls) {
        const elapsed = now - ball.startTime
        const msPerStep = 120
        const totalDuration = ball.positions.length * msPerStep

        if (elapsed >= totalDuration) {
          renderPositions.push(ball.positions[ball.positions.length - 1])

          if (!ball.settled) {
            ball.settled = true
            const mult = multipliers[ball.slot]
            const winnings = ball.betAmount * mult
            const profit = winnings - ball.betAmount
            setBalance(getBalance() + winnings)
            refreshBalance()
            addTransaction('Plinko', profit)
            setLastResult({ mult, profit, slot: ball.slot })
            setHitSlots(prev => [...prev, ball.slot])
            setTimeout(() => {
              setHitSlots(prev => prev.filter((_, i) => i > 0))
            }, 800)
          }
          continue
        }

        const progress = elapsed / msPerStep
        const posIndex = Math.floor(progress)
        const t = progress - posIndex

        if (posIndex >= ball.positions.length - 1) {
          renderPositions.push(ball.positions[ball.positions.length - 1])
          continue
        }

        const eased = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2

        const from = ball.positions[posIndex]
        const to = ball.positions[posIndex + 1]
        renderPositions.push({
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
        })
      }

      drawBoard(renderPositions)

      ballsRef.current = currentBalls.filter(b => {
        if (!b.settled) return true
        return (now - b.startTime) < b.positions.length * 120 + 500
      })

      if (ballsRef.current.length > 0) {
        animRef.current = requestAnimationFrame(loop)
      } else {
        animRef.current = null
        drawBoard()
      }
    }

    animRef.current = requestAnimationFrame(loop)
  }, [drawBoard, multipliers, refreshBalance])

  const dropBall = () => {
    const numBet = parseFloat(bet)
    if (!numBet || numBet <= 0 || numBet > getBalance()) return

    setBalance(getBalance() - numBet)
    refreshBalance()

    const path = []
    for (let i = 0; i < rows; i++) {
      path.push(Math.random() < 0.5)
    }

    const { positions, slot } = computePath(path, rows)

    const ball = {
      id: ballIdCounter.current++,
      positions,
      slot,
      betAmount: numBet,
      startTime: Date.now(),
      settled: false,
    }

    ballsRef.current.push(ball)
    startRenderLoop()
  }

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  useEffect(() => {
    ballsRef.current = []
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    setLastResult(null)
    setHitSlots([])
  }, [rows, risk])

  const activeBallCount = ballsRef.current.filter(b => !b.settled).length
  const selectClass = 'bg-primary border-2 border-tertiary text-white px-2.5 py-1.5 rounded-lg text-sm outline-none focus:border-accent'

  return (
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-2xl font-bold mb-4 text-white">Plinko</h2>

      <div className="flex gap-4 justify-center items-center mb-4 flex-wrap">
        <BetControls bet={bet} setBet={setBet} balance={balance} />
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary font-semibold">Rows:</label>
          <select className={selectClass} value={rows} onChange={e => setRows(parseInt(e.target.value))} disabled={activeBallCount > 0}>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary font-semibold">Risk:</label>
          <select className={selectClass} value={risk} onChange={e => setRisk(e.target.value)} disabled={activeBallCount > 0}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
      </div>

      <div className="relative mx-auto mb-4 bg-secondary rounded-2xl overflow-hidden" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <canvas ref={canvasRef} className="plinko-canvas" width={CANVAS_W} height={CANVAS_H} />
      </div>

      <div className="flex justify-center gap-1 mb-4 flex-wrap">
        {multipliers.map((m, i) => (
          <div
            key={i}
            className={`plinko-slot py-1.5 px-2 rounded text-[11px] font-bold min-w-[40px] text-center text-white transition-transform ${hitSlots.includes(i) ? 'hit' : ''}`}
            style={{ background: slotColors[i] }}
          >
            {m}x
          </div>
        ))}
      </div>

      {lastResult && (
        <div className={`p-3 rounded-lg font-semibold my-3 text-sm inline-block ${
          lastResult.profit >= 0
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-danger border border-red-500/30'
        }`}>
          Landed on {lastResult.mult}x — {lastResult.profit >= 0 ? `+$${lastResult.profit.toFixed(2)}` : `-$${Math.abs(lastResult.profit).toFixed(2)}`}
        </div>
      )}

      <div className="mt-2">
        <button
          className="bg-accent hover:bg-accent-hover text-primary px-6 py-2.5 rounded-lg font-bold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={dropBall}
          disabled={!parseFloat(bet) || parseFloat(bet) > balance}
        >
          Drop Ball
        </button>
      </div>
    </div>
  )
}
