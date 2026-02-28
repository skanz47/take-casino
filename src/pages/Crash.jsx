import { useState, useRef, useEffect, useCallback } from 'react'
import BetControls from '../components/BetControls'
import { getBalance, setBalance } from '../utils/balance'

function generateCrashPoint() {
  const r = Math.random()
  return Math.max(1, Math.floor((0.99 / r) * 100) / 100)
}

export default function Crash({ balance, refreshBalance, addTransaction }) {
  const [bet, setBet] = useState('5.00')
  const [phase, setPhase] = useState('waiting') // waiting, running, crashed, cashed
  const [multiplier, setMultiplier] = useState(1.00)
  const [crashPoint, setCrashPoint] = useState(0)
  const [profit, setProfit] = useState(0)
  const [history, setHistory] = useState([])
  const animRef = useRef(null)
  const startTimeRef = useRef(0)
  const canvasRef = useRef(null)
  const pointsRef = useRef([])

  const drawGraph = useCallback((currentMult, isCrashed) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      const y = h - (h / 5) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    const points = pointsRef.current
    if (points.length < 2) return

    const maxMult = Math.max(currentMult, 2)
    const xScale = w / Math.max(points.length - 1, 1)
    const padBottom = 10
    const padTop = 20
    const graphH = h - padTop - padBottom

    // Power >1 compresses low values and stretches high values,
    // so the line stays flat at first then sweeps sharply upward (like Stake)
    const toY = (mult) => {
      const normalized = Math.max(mult - 1, 0) / (maxMult - 1)
      const curved = Math.pow(normalized, 2)
      return h - padBottom - curved * graphH
    }

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    const labelSteps = [1, 1.5, 2, 3, 5, 10, 20, 50, 100]
    for (const lbl of labelSteps) {
      if (lbl > maxMult) break
      const ly = toY(lbl)
      if (ly < padTop + 10 || ly > h - padBottom - 5) continue
      ctx.fillText(`${lbl.toFixed(lbl < 10 ? 1 : 0)}×`, 4, ly - 3)
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.moveTo(40, ly)
      ctx.lineTo(w, ly)
      ctx.stroke()
    }

    // Draw the curve
    ctx.beginPath()
    ctx.strokeStyle = isCrashed ? '#ed4163' : '#00e701'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'

    for (let i = 0; i < points.length; i++) {
      const x = i * xScale
      const y = toY(points[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Glow effect on the line
    ctx.save()
    ctx.shadowColor = isCrashed ? '#ed4163' : '#00e701'
    ctx.shadowBlur = 12
    ctx.stroke()
    ctx.restore()

    // Fill under line with gradient
    const lastX = (points.length - 1) * xScale
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    if (isCrashed) {
      gradient.addColorStop(0, 'rgba(237,65,99,0.2)')
      gradient.addColorStop(1, 'rgba(237,65,99,0.02)')
    } else {
      gradient.addColorStop(0, 'rgba(0,231,1,0.15)')
      gradient.addColorStop(1, 'rgba(0,231,1,0.01)')
    }
    ctx.lineTo(lastX, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()
  }, [])

  const startGame = () => {
    const numBet = parseFloat(bet)
    if (!numBet || numBet <= 0 || numBet > balance) return

    setBalance(getBalance() - numBet)
    refreshBalance()

    const cp = generateCrashPoint()
    setCrashPoint(cp)
    setMultiplier(1.00)
    setProfit(0)
    setPhase('running')
    startTimeRef.current = Date.now()
    pointsRef.current = [1]

    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      // Multiplier grows exponentially: e^(0.15*t)
      const currentMult = Math.floor(Math.exp(0.15 * elapsed) * 100) / 100

      if (currentMult >= cp) {
        setMultiplier(cp)
        pointsRef.current.push(cp)
        drawGraph(cp, true)
        setHistory(prev => [cp, ...prev].slice(0, 10))
        addTransaction('Crash', -parseFloat(bet))
        setPhase('crashed')
        return
      }

      setMultiplier(currentMult)
      pointsRef.current.push(currentMult)
      // Keep points array manageable
      if (pointsRef.current.length > 500) {
        pointsRef.current = pointsRef.current.filter((_, i) => i % 2 === 0)
      }
      drawGraph(currentMult, false)
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
  }

  const cashOut = () => {
    if (phase !== 'running') return
    cancelAnimationFrame(animRef.current)

    const numBet = parseFloat(bet)
    const winnings = numBet * multiplier
    const p = winnings - numBet
    setProfit(p)
    setBalance(getBalance() + winnings)
    refreshBalance()
    addTransaction('Crash', p)
    setHistory(prev => [crashPoint, ...prev].slice(0, 10))
    setPhase('cashed')
    drawGraph(multiplier, false)
  }

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  // Reset canvas on new game
  useEffect(() => {
    if (phase === 'waiting') {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      pointsRef.current = []
    }
  }, [phase])

  const getMultClass = () => {
    if (phase === 'running') return 'running'
    if (phase === 'crashed') return 'crashed'
    if (phase === 'cashed') return 'cashed'
    return 'waiting'
  }

  return (
    <div className="game-container crash-container">
      <h2 className="game-title">Crash</h2>

      {history.length > 0 && (
        <div className="crash-history">
          {history.map((val, i) => (
            <span key={i} className={`crash-history-item ${val < 2 ? 'low' : 'high'}`}>
              {val.toFixed(2)}×
            </span>
          ))}
        </div>
      )}

      <div className="crash-graph">
        <canvas ref={canvasRef} className="crash-graph-line" width={800} height={300} />
        <div className={`crash-multiplier ${getMultClass()}`} style={{ position: 'relative', zIndex: 1 }}>
          {phase === 'waiting' && '1.00×'}
          {phase === 'running' && `${multiplier.toFixed(2)}×`}
          {phase === 'crashed' && `${crashPoint.toFixed(2)}×`}
          {phase === 'cashed' && `${multiplier.toFixed(2)}×`}
        </div>
      </div>

      {phase === 'crashed' && (
        <div className="game-result lose">Crashed at {crashPoint.toFixed(2)}× — Lost ${parseFloat(bet).toFixed(2)}</div>
      )}
      {phase === 'cashed' && (
        <div className="game-result win">Cashed out at {multiplier.toFixed(2)}× — Profit +${profit.toFixed(2)}</div>
      )}

      <div className="crash-controls">
        <BetControls bet={bet} setBet={setBet} balance={balance} disabled={phase === 'running'} />
        {phase === 'waiting' && (
          <button className="btn btn-primary" onClick={startGame} disabled={!parseFloat(bet) || parseFloat(bet) > balance}>
            Start
          </button>
        )}
        {phase === 'running' && (
          <button className="btn btn-warning" onClick={cashOut} style={{ fontSize: '1.2rem', padding: '12px 32px' }}>
            Cash Out ({multiplier.toFixed(2)}×)
          </button>
        )}
        {(phase === 'crashed' || phase === 'cashed') && (
          <button className="btn btn-primary" onClick={() => setPhase('waiting')}>
            Play Again
          </button>
        )}
      </div>
    </div>
  )
}
