import { useState, useRef, useEffect, useCallback } from 'react'
import BetControls from '../components/BetControls'
import { getBalance, setBalance } from '../utils/balance'

function generateCrashPoint() {
  const r = Math.random()
  return Math.max(1, Math.floor((0.99 / r) * 100) / 100)
}

export default function Crash({ balance, refreshBalance, addTransaction }) {
  const [bet, setBet] = useState('5.00')
  const [phase, setPhase] = useState('waiting')
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

    const toY = (mult) => {
      const normalized = Math.max(mult - 1, 0) / (maxMult - 1)
      const curved = Math.pow(normalized, 2)
      return h - padBottom - curved * graphH
    }

    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '11px Inter, sans-serif'
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

    ctx.save()
    ctx.shadowColor = isCrashed ? '#ed4163' : '#00e701'
    ctx.shadowBlur = 12
    ctx.stroke()
    ctx.restore()

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

  const multColorClass = {
    running: 'text-accent',
    crashed: 'text-danger',
    cashed: 'text-warning',
    waiting: 'text-text-muted',
  }[phase]

  return (
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-2xl font-bold mb-4 text-white">Crash</h2>

      {history.length > 0 && (
        <div className="flex gap-2 justify-center flex-wrap mb-3">
          {history.map((val, i) => (
            <span key={i} className={`px-3 py-1 rounded-full text-sm font-bold bg-white/5 ${val < 2 ? 'text-danger' : 'text-green-400'}`}>
              {val.toFixed(2)}×
            </span>
          ))}
        </div>
      )}

      <div className="bg-secondary rounded-2xl h-[300px] flex items-center justify-center mb-6 relative overflow-hidden">
        <canvas ref={canvasRef} className="crash-graph-line" width={800} height={300} />
        <div className={`text-6xl font-extrabold relative z-10 ${multColorClass}`}>
          {phase === 'waiting' && '1.00×'}
          {phase === 'running' && `${multiplier.toFixed(2)}×`}
          {phase === 'crashed' && `${crashPoint.toFixed(2)}×`}
          {phase === 'cashed' && `${multiplier.toFixed(2)}×`}
        </div>
      </div>

      {phase === 'crashed' && (
        <div className="p-3 rounded-lg font-semibold my-3 text-sm bg-red-500/10 text-danger border border-red-500/30">
          Crashed at {crashPoint.toFixed(2)}× — Lost ${parseFloat(bet).toFixed(2)}
        </div>
      )}
      {phase === 'cashed' && (
        <div className="p-3 rounded-lg font-semibold my-3 text-sm bg-green-500/10 text-green-400 border border-green-500/30">
          Cashed out at {multiplier.toFixed(2)}× — Profit +${profit.toFixed(2)}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <BetControls bet={bet} setBet={setBet} balance={balance} disabled={phase === 'running'} />
        {phase === 'waiting' && (
          <button
            className="bg-accent hover:bg-accent-hover text-primary px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={startGame}
            disabled={!parseFloat(bet) || parseFloat(bet) > balance}
          >
            Start
          </button>
        )}
        {phase === 'running' && (
          <button
            className="bg-warning hover:opacity-85 text-primary text-lg px-8 py-3 rounded-lg font-bold transition-colors border-none cursor-pointer"
            onClick={cashOut}
          >
            Cash Out ({multiplier.toFixed(2)}×)
          </button>
        )}
        {(phase === 'crashed' || phase === 'cashed') && (
          <button
            className="bg-accent hover:bg-accent-hover text-primary px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer"
            onClick={() => setPhase('waiting')}
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  )
}
