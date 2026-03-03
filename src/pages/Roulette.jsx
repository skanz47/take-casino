import { useState, useRef, useEffect, useCallback } from 'react'
import BetControls from '../components/BetControls'
import { getBalance, setBalance } from '../utils/balance'

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]

const WHEEL_ORDER = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
]

function getColor(num) {
  if (num === 0 || num === '00') return 'green'
  const n = typeof num === 'string' ? parseInt(num) : num
  return RED_NUMBERS.includes(n) ? 'red' : 'black'
}

function numEquals(a, b) {
  return String(a) === String(b)
}

const BOARD_ROWS = [
  [3,6,9,12,15,18,21,24,27,30,33,36],
  [2,5,8,11,14,17,20,23,26,29,32,35],
  [1,4,7,10,13,16,19,22,25,28,31,34],
]

const OUTSIDE_BETS = [
  { label: '1-12', key: 'dozen1' },
  { label: '13-24', key: 'dozen2' },
  { label: '25-36', key: 'dozen3' },
  { label: 'Red', key: 'red' },
  { label: 'Black', key: 'black' },
  { label: 'Odd', key: 'odd' },
  { label: 'Even', key: 'even' },
  { label: '1-18', key: 'low' },
  { label: '19-36', key: 'high' },
]

function evaluateBet(betKey, result) {
  const n = typeof result === 'string' ? -1 : result
  if (result === 0 || result === '00') {
    if (numEquals(betKey, result)) return 35
    return -1
  }

  if (typeof betKey === 'number' || betKey === '00') {
    return numEquals(betKey, result) ? 35 : -1
  }
  switch (betKey) {
    case 'red': return RED_NUMBERS.includes(n) ? 1 : -1
    case 'black': return !RED_NUMBERS.includes(n) && n > 0 ? 1 : -1
    case 'odd': return n > 0 && n % 2 === 1 ? 1 : -1
    case 'even': return n > 0 && n % 2 === 0 ? 1 : -1
    case 'low': return n >= 1 && n <= 18 ? 1 : -1
    case 'high': return n >= 19 && n <= 36 ? 1 : -1
    case 'dozen1': return n >= 1 && n <= 12 ? 2 : -1
    case 'dozen2': return n >= 13 && n <= 24 ? 2 : -1
    case 'dozen3': return n >= 25 && n <= 36 ? 2 : -1
    default: return -1
  }
}

const COLOR_MAP = { red: '#e53935', black: '#1a1a1a', green: '#0a7e28' }

function drawWheel(ctx, cx, cy, radius, rotation) {
  const count = WHEEL_ORDER.length
  const arc = (Math.PI * 2) / count

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2)
  ctx.lineWidth = 4
  ctx.strokeStyle = '#c9a32a'
  ctx.stroke()
  ctx.restore()

  for (let i = 0; i < count; i++) {
    const angle = rotation + i * arc
    const num = WHEEL_ORDER[i]
    const color = getColor(num)

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, angle, angle + arc)
    ctx.closePath()
    ctx.fillStyle = COLOR_MAP[color]
    ctx.fill()
    ctx.strokeStyle = '#3a3a3a'
    ctx.lineWidth = 0.5
    ctx.stroke()

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle + arc / 2)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(radius * 0.08)}px sans-serif`
    ctx.fillText(String(num), radius * 0.82, 0)
    ctx.restore()
  }

  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = '#1a2c38'
  ctx.fill()
  ctx.strokeStyle = '#c9a32a'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2)
  ctx.strokeStyle = '#c9a32a'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx, cy - radius - 14)
  ctx.lineTo(cx - 10, cy - radius - 28)
  ctx.lineTo(cx + 10, cy - radius - 28)
  ctx.closePath()
  ctx.fillStyle = '#c9a32a'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.stroke()
}

export default function Roulette({ balance, refreshBalance, addTransaction }) {
  const [bet, setBet] = useState('5.00')
  const [selectedBets, setSelectedBets] = useState([])
  const [result, setResult] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [message, setMessage] = useState(null)
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const currentAngleRef = useRef(0)

  const WHEEL_SIZE = 320
  const RADIUS = WHEEL_SIZE / 2 - 30

  const chipAmount = parseFloat(bet) || 0

  const renderWheel = useCallback((angle) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE)
    drawWheel(ctx, WHEEL_SIZE / 2, WHEEL_SIZE / 2, RADIUS, angle)
  }, [RADIUS, WHEEL_SIZE])

  useEffect(() => {
    renderWheel(currentAngleRef.current)
  }, [renderWheel])

  const placeBet = (key) => {
    if (spinning || chipAmount <= 0 || chipAmount > getBalance()) return
    const existing = selectedBets.find(b => numEquals(b.key, key))
    if (existing) {
      if (chipAmount > getBalance()) return
      setSelectedBets(selectedBets.map(b => numEquals(b.key, key) ? { ...b, amount: b.amount + chipAmount } : b))
    } else {
      setSelectedBets([...selectedBets, { key, amount: chipAmount }])
    }
    setBalance(getBalance() - chipAmount)
    refreshBalance()
  }

  const clearBets = () => {
    const totalReturn = selectedBets.reduce((s, b) => s + b.amount, 0)
    setBalance(getBalance() + totalReturn)
    refreshBalance()
    setSelectedBets([])
    setResult(null)
    setMessage(null)
  }

  const getPocketFromAngle = (rotation) => {
    const count = WHEEL_ORDER.length
    const arc = (Math.PI * 2) / count
    let offset = (-Math.PI / 2 - rotation) % (Math.PI * 2)
    offset = ((offset % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const index = Math.floor(offset / arc) % count
    return WHEEL_ORDER[index]
  }

  const spin = () => {
    if (selectedBets.length === 0) return
    setSpinning(true)
    setResult(null)
    setMessage(null)

    const extraSpins = (5 + Math.random() * 3) * Math.PI * 2
    const randomOffset = Math.random() * Math.PI * 2
    const targetAngle = currentAngleRef.current - extraSpins - randomOffset

    const startAngle = currentAngleRef.current
    const totalDelta = targetAngle - startAngle
    const duration = 4000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const angle = startAngle + totalDelta * eased

      currentAngleRef.current = angle
      renderWheel(angle)

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        const outcome = getPocketFromAngle(angle)
        currentAngleRef.current = angle
        setResult(outcome)
        setSpinning(false)

        let totalWin = 0
        for (const b of selectedBets) {
          const payout = evaluateBet(b.key, outcome)
          if (payout >= 0) {
            totalWin += b.amount + b.amount * payout
          }
        }

        if (totalWin > 0) {
          setBalance(getBalance() + totalWin)
          refreshBalance()
          const totalBet = selectedBets.reduce((s, b) => s + b.amount, 0)
          const profit = totalWin - totalBet
          addTransaction('Roulette', profit)
          setMessage({ type: profit >= 0 ? 'win' : 'lose', text: profit >= 0 ? `Won $${totalWin.toFixed(2)} (+$${profit.toFixed(2)} profit)` : `Returned $${totalWin.toFixed(2)}` })
        } else {
          const totalLost = selectedBets.reduce((s, b) => s + b.amount, 0)
          addTransaction('Roulette', -totalLost)
          setMessage({ type: 'lose', text: `Lost $${totalLost.toFixed(2)}` })
        }
        setSelectedBets([])
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  const getBetAmount = (key) => {
    const b = selectedBets.find(x => numEquals(x.key, key))
    return b ? b.amount : 0
  }

  const resultDisplay = result !== null ? String(result) : null

  const numBtnBase = 'py-2.5 px-1 text-center border-none rounded cursor-pointer font-semibold text-sm text-white transition-all hover:opacity-80 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Roulette</h2>

      <BetControls bet={bet} setBet={setBet} balance={balance} disabled={spinning} />

      <div className="flex flex-col items-center mb-6 relative">
        <canvas
          ref={canvasRef}
          className="roulette-canvas"
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
        />
        {result !== null && !spinning && (
          <div className={`roulette-result-badge mt-3 px-6 py-2 rounded-full text-2xl font-extrabold ${
            getColor(result) === 'green' ? 'bg-green-700 text-white' :
            getColor(result) === 'red' ? 'bg-red-600 text-white' :
            'bg-zinc-800 text-white border border-zinc-500'
          }`}>
            {resultDisplay}
          </div>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg font-semibold my-3 text-sm ${
          message.type === 'win'
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-danger border border-red-500/30'
        }`}>{message.text}</div>
      )}

      {selectedBets.length > 0 && (
        <div className="bg-secondary rounded-lg px-4 py-3 mb-3 text-sm text-text-secondary">
          Bets placed: {selectedBets.map(b => `${String(b.key)} ($${b.amount.toFixed(2)})`).join(', ')}
        </div>
      )}

      <div className="flex flex-col gap-1 mb-4">
        <div className="flex gap-1 mb-1">
          <button
            className={`${numBtnBase} flex-1 bg-green-700 ${getBetAmount(0) > 0 ? 'ring-2 ring-accent ring-offset-1 ring-offset-primary' : ''}`}
            onClick={() => placeBet(0)}
            disabled={spinning}
          >0</button>
          <button
            className={`${numBtnBase} flex-1 bg-green-700 ${getBetAmount('00') > 0 ? 'ring-2 ring-accent ring-offset-1 ring-offset-primary' : ''}`}
            onClick={() => placeBet('00')}
            disabled={spinning}
          >00</button>
        </div>
        {BOARD_ROWS.map((row, ri) => (
          <div className="grid grid-cols-12 gap-1" key={ri}>
            {row.map(num => (
              <button
                key={num}
                className={`${numBtnBase} ${getColor(num) === 'red' ? 'bg-red-600' : 'bg-zinc-800'} ${getBetAmount(num) > 0 ? 'ring-2 ring-accent ring-offset-1 ring-offset-primary' : ''}`}
                onClick={() => placeBet(num)}
                disabled={spinning}
              >{num}</button>
            ))}
          </div>
        ))}

        <div className="flex gap-1 flex-wrap mt-2">
          {OUTSIDE_BETS.map(ob => (
            <button
              key={ob.key}
              className={`flex-1 min-w-[80px] py-2.5 px-2 bg-tertiary border-2 rounded-lg cursor-pointer text-xs font-semibold text-center transition-all hover:text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                getBetAmount(ob.key) > 0
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-transparent text-text-secondary hover:border-accent'
              }`}
              onClick={() => placeBet(ob.key)}
              disabled={spinning}
            >
              {ob.label}
              {getBetAmount(ob.key) > 0 && ` ($${getBetAmount(ob.key).toFixed(2)})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="bg-accent hover:bg-accent-hover text-primary px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={spin}
          disabled={spinning || selectedBets.length === 0}
        >
          {spinning ? 'Spinning...' : 'Spin'}
        </button>
        <button
          className="bg-tertiary hover:bg-tertiary/80 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={clearBets}
          disabled={spinning || selectedBets.length === 0}
        >
          Clear Bets
        </button>
      </div>
    </div>
  )
}
