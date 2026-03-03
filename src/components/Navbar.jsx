import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetBalance } from '../utils/balance'

const STARTING_BALANCE = 100

const SEARCHABLE_GAMES = [
  { name: 'Blackjack', path: '/blackjack', icon: '🃏' },
  { name: 'Roulette', path: '/roulette', icon: '🎰' },
  { name: 'Crash', path: '/crash', icon: '📈' },
  { name: 'Mines', path: '/mines', icon: '💣' },
  { name: 'Plinko', path: '/plinko', icon: '⚪' },
]

export default function Navbar({ balance, refreshBalance, transactions, onClearTransactions, onToggleSidebar }) {
  const [logOpen, setLogOpen] = useState(false)
  const [pnlOpen, setPnlOpen] = useState(false)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const logRef = useRef(null)
  const pnlRef = useRef(null)
  const canvasRef = useRef(null)
  const chartLayoutRef = useRef(null)
  const searchRef = useRef(null)
  const navigate = useNavigate()

  const searchResults = searchQuery.trim()
    ? SEARCHABLE_GAMES.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : SEARCHABLE_GAMES

  const showSearchDropdown = searchFocused && searchQuery.trim().length > 0

  const handleSearchSelect = (game) => {
    navigate(game.path)
    setSearchQuery('')
    setSearchFocused(false)
  }

  const handleReset = () => {
    resetBalance()
    refreshBalance()
    onClearTransactions()
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (logRef.current && !logRef.current.contains(e.target)) setLogOpen(false)
      if (pnlRef.current && !pnlRef.current.contains(e.target)) setPnlOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false)
    }
    if (logOpen || pnlOpen || searchFocused) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [logOpen, pnlOpen, searchFocused])

  const formatTime = (ts) => {
    const d = new Date(ts)
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${m} ${ampm}`
  }

  const totalProfit = balance - STARTING_BALANCE
  const pnlPercent = (totalProfit / STARTING_BALANCE) * 100

  const pnlData = (() => {
    const reversed = [...transactions].reverse()
    let cumulative = 0
    const points = [0]
    for (const tx of reversed) {
      cumulative += tx.amount
      points.push(cumulative)
    }
    return points
  })()

  const getYTicks = (min, max) => {
    const range = max - min || 1
    const rawStep = range / 4
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const nice = [1, 2, 5, 10]
    let step = nice.find(n => n * mag >= rawStep) * mag
    const ticks = []
    const start = Math.ceil(min / step) * step
    for (let v = start; v <= max + step * 0.01; v += step) {
      ticks.push(parseFloat(v.toFixed(10)))
    }
    return ticks
  }

  const drawChart = useCallback((hoverIndex = null) => {
    const canvas = canvasRef.current
    if (!canvas || pnlData.length < 2) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const padLeft = 50
    const padRight = 16
    const padTop = 16
    const padBottom = 28

    const min = Math.min(...pnlData)
    const max = Math.max(...pnlData)
    const range = max - min || 1

    const chartW = w - padLeft - padRight
    const chartH = h - padTop - padBottom

    const toX = (i) => padLeft + (i / (pnlData.length - 1)) * chartW
    const toY = (v) => padTop + (1 - (v - min) / range) * chartH

    chartLayoutRef.current = { padLeft, padRight, padTop, padBottom, chartW, chartH, min, max, range, toX, toY }

    const yTicks = getYTicks(min, max)
    ctx.font = '11px Inter, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (const tick of yTicks) {
      const y = toY(tick)
      if (y < padTop - 5 || y > h - padBottom + 5) continue
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.moveTo(padLeft, y)
      ctx.lineTo(w - padRight, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillText(`$${tick.toFixed(tick === Math.round(tick) ? 0 : 2)}`, padLeft - 8, y)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    const totalPoints = pnlData.length
    const maxLabels = 6
    const xStep = Math.max(1, Math.ceil((totalPoints - 1) / maxLabels))
    for (let i = 0; i < totalPoints; i += xStep) {
      const x = toX(i)
      ctx.fillText(`#${i}`, x, h - padBottom + 8)
    }
    if ((totalPoints - 1) % xStep !== 0) {
      ctx.fillText(`#${totalPoints - 1}`, toX(totalPoints - 1), h - padBottom + 8)
    }

    if (min < 0 && max > 0) {
      const zeroY = toY(0)
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.moveTo(padLeft, zeroY)
      ctx.lineTo(w - padRight, zeroY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const isPositive = pnlData[pnlData.length - 1] >= 0
    const lineColor = isPositive ? '#00c850' : '#ed4163'

    ctx.beginPath()
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    for (let i = 0; i < pnlData.length; i++) {
      const x = toX(i)
      const y = toY(pnlData[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.save()
    ctx.shadowColor = lineColor
    ctx.shadowBlur = 8
    ctx.stroke()
    ctx.restore()

    const lastX = toX(pnlData.length - 1)
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(0,200,80,0.15)')
      gradient.addColorStop(1, 'rgba(0,200,80,0.01)')
    } else {
      gradient.addColorStop(0, 'rgba(237,65,99,0.15)')
      gradient.addColorStop(1, 'rgba(237,65,99,0.01)')
    }
    ctx.lineTo(lastX, h - padBottom)
    ctx.lineTo(toX(0), h - padBottom)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < pnlData.length) {
      const hx = toX(hoverIndex)
      const hy = toY(pnlData[hoverIndex])

      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.moveTo(hx, padTop)
      ctx.lineTo(hx, h - padBottom)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.moveTo(padLeft, hy)
      ctx.lineTo(w - padRight, hy)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.beginPath()
      ctx.arc(hx, hy, 5, 0, Math.PI * 2)
      ctx.fillStyle = lineColor
      ctx.fill()
      ctx.beginPath()
      ctx.arc(hx, hy, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
    }
  }, [pnlData])

  useEffect(() => {
    if (pnlOpen) drawChart(hoverInfo?.index ?? null)
  }, [pnlOpen, drawChart, hoverInfo])

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current
    const layout = chartLayoutRef.current
    if (!canvas || !layout || pnlData.length < 2) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX

    let closestIdx = 0
    let closestDist = Infinity
    for (let i = 0; i < pnlData.length; i++) {
      const x = layout.toX(i)
      const dist = Math.abs(mouseX - x)
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    }

    const pointX = layout.toX(closestIdx)
    const tooltipX = (pointX / canvas.width) * rect.width

    setHoverInfo({
      index: closestIdx,
      value: pnlData[closestIdx],
      x: tooltipX,
    })
  }

  const handleCanvasMouseLeave = () => {
    setHoverInfo(null)
  }

  return (
    <nav className="fixed top-0 left-0 md:left-[260px] right-0 h-16 bg-secondary flex items-center justify-between px-4 md:px-6 border-b border-tertiary z-40">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Hamburger - mobile only */}
        <button className="md:hidden text-text-secondary hover:text-white p-1" onClick={onToggleSidebar}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        {/* Search Bar */}
        <div className="hidden sm:block relative" ref={searchRef}>
          <div className="flex items-center bg-primary border border-tertiary rounded-lg px-3 py-2 w-48 lg:w-64 focus-within:border-accent transition-colors">
            <svg className="w-4 h-4 text-text-muted mr-2 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search games..."
              className="bg-transparent text-sm text-white placeholder-text-muted outline-none w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  handleSearchSelect(searchResults[0])
                }
                if (e.key === 'Escape') {
                  setSearchFocused(false)
                  setSearchQuery('')
                }
              }}
            />
            {searchQuery && (
              <button
                className="text-text-muted hover:text-white ml-1 text-xs"
                onClick={() => { setSearchQuery(''); setSearchFocused(false) }}
              >
                ✕
              </button>
            )}
          </div>
          {showSearchDropdown && (
            <div className="absolute top-full left-0 mt-1 w-full bg-secondary border border-tertiary rounded-lg shadow-2xl overflow-hidden z-50">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-text-muted">No games found</div>
              ) : (
                searchResults.map(game => (
                  <button
                    key={game.path}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-tertiary hover:text-white transition-colors border-none cursor-pointer bg-transparent"
                    onClick={() => handleSearchSelect(game)}
                  >
                    <span className="text-lg">{game.icon}</span>
                    {game.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Balance */}
        <div className="flex items-center bg-tertiary rounded-lg px-3 py-2 gap-2">
          <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
          </svg>
          <span className="text-sm font-bold text-accent">${balance.toFixed(2)}</span>
        </div>

        {/* Top Up / Reset */}
        <button
          className="bg-accent hover:bg-accent-hover text-primary text-xs md:text-sm font-bold px-3 md:px-4 py-2 rounded-lg transition-colors"
          onClick={handleReset}
        >
          Top Up
        </button>

        {/* Transaction Log */}
        <div className="relative" ref={logRef}>
          <button
            className="bg-tertiary hover:bg-tertiary/80 text-text-secondary hover:text-white p-2 rounded-lg transition-colors"
            onClick={() => { setLogOpen(!logOpen); setPnlOpen(false) }}
            title="Transaction Log"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          {logOpen && (
            <div className="fixed top-[68px] right-4 md:right-6 w-80 bg-secondary border border-tertiary rounded-xl shadow-2xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-tertiary">
                <span className="text-sm font-bold text-white">Transaction Log</span>
                {transactions.length > 0 && (
                  <button className="text-xs text-text-muted hover:text-danger transition-colors" onClick={onClearTransactions}>Clear</button>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-primary text-sm font-semibold text-text-secondary">
                <span>Net Profit</span>
                <span className={totalProfit >= 0 ? 'text-green-400' : 'text-danger'}>
                  {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)}
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {transactions.length === 0 && (
                  <div className="py-8 text-center text-text-muted text-sm">No transactions yet</div>
                )}
                {transactions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-white">{tx.game}</span>
                      <span className="text-xs text-text-muted">{formatTime(tx.time)}</span>
                    </div>
                    <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-danger'}`}>
                      {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PNL */}
        <div className="relative" ref={pnlRef}>
          <button
            className="bg-tertiary hover:bg-tertiary/80 text-text-secondary hover:text-white px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors"
            onClick={() => { setPnlOpen(!pnlOpen); setLogOpen(false) }}
          >
            PNL
          </button>
          {pnlOpen && (
            <div className="fixed top-[68px] right-4 md:right-6 w-80 bg-secondary border border-tertiary rounded-xl shadow-2xl z-50">
              <div className="px-4 py-3 border-b border-tertiary">
                <span className="text-sm font-bold text-white">Profit &amp; Loss</span>
              </div>
              <div className="flex border-b border-tertiary">
                <div className="flex-1 px-4 py-3 flex flex-col gap-1 border-r border-tertiary">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Net P&amp;L</span>
                  <span className={`text-lg font-extrabold ${totalProfit >= 0 ? 'text-green-400' : 'text-danger'}`}>
                    {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)}
                  </span>
                </div>
                <div className="flex-1 px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Return</span>
                  <span className={`text-lg font-extrabold ${pnlPercent >= 0 ? 'text-green-400' : 'text-danger'}`}>
                    {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3">
                {pnlData.length < 2 ? (
                  <div className="py-6 text-center text-text-muted text-sm">Play a game to see your PNL chart</div>
                ) : (
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={560}
                      height={240}
                      className="pnl-canvas bg-primary"
                      onMouseMove={handleCanvasMouseMove}
                      onMouseLeave={handleCanvasMouseLeave}
                    />
                    {hoverInfo && (
                      <div
                        className="absolute -top-1 bg-tertiary border border-white/10 rounded-md px-2.5 py-1.5 flex flex-col items-center gap-0.5 pointer-events-none whitespace-nowrap z-10"
                        style={{ left: `${hoverInfo.x}px`, transform: 'translateX(-50%)' }}
                      >
                        <span className="text-[10px] text-text-muted font-semibold">Game #{hoverInfo.index}</span>
                        <span className={`text-sm font-extrabold ${hoverInfo.value >= 0 ? 'text-green-400' : 'text-danger'}`}>
                          {hoverInfo.value >= 0 ? '+' : '-'}${Math.abs(hoverInfo.value).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="hidden sm:flex items-center gap-2 ml-1">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-sm">
            P
          </div>
          <span className="text-sm font-semibold text-text-secondary hidden lg:block">Player</span>
        </div>
      </div>
    </nav>
  )
}
