import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { resetBalance } from '../utils/balance'

const STARTING_BALANCE = 100

export default function Navbar({ balance, refreshBalance, transactions, onClearTransactions }) {
  const [logOpen, setLogOpen] = useState(false)
  const [pnlOpen, setPnlOpen] = useState(false)
  const [hoverInfo, setHoverInfo] = useState(null)
  const logRef = useRef(null)
  const pnlRef = useRef(null)
  const canvasRef = useRef(null)
  const chartLayoutRef = useRef(null)

  const handleReset = () => {
    resetBalance()
    refreshBalance()
    onClearTransactions()
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (logRef.current && !logRef.current.contains(e.target)) setLogOpen(false)
      if (pnlRef.current && !pnlRef.current.contains(e.target)) setPnlOpen(false)
    }
    if (logOpen || pnlOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [logOpen, pnlOpen])

  const formatTime = (ts) => {
    const d = new Date(ts)
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${m} ${ampm}`
  }

  const totalProfit = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const pnlPercent = (totalProfit / STARTING_BALANCE) * 100

  // Build cumulative PNL data (oldest to newest)
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

  // Compute nice Y-axis tick values
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

    // Store layout for hover calculations
    chartLayoutRef.current = { padLeft, padRight, padTop, padBottom, chartW, chartH, min, max, range, toX, toY }

    // Y-axis ticks
    const yTicks = getYTicks(min, max)
    ctx.font = '11px -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (const tick of yTicks) {
      const y = toY(tick)
      if (y < padTop - 5 || y > h - padBottom + 5) continue

      // Grid line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.moveTo(padLeft, y)
      ctx.lineTo(w - padRight, y)
      ctx.stroke()

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillText(`$${tick.toFixed(tick === Math.round(tick) ? 0 : 2)}`, padLeft - 8, y)
    }

    // X-axis labels (game number)
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
    // Always show last
    if ((totalPoints - 1) % xStep !== 0) {
      ctx.fillText(`#${totalPoints - 1}`, toX(totalPoints - 1), h - padBottom + 8)
    }

    // Zero line
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

    // Line
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

    // Glow
    ctx.save()
    ctx.shadowColor = lineColor
    ctx.shadowBlur = 8
    ctx.stroke()
    ctx.restore()

    // Fill under
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

    // Hover crosshair and dot
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < pnlData.length) {
      const hx = toX(hoverIndex)
      const hy = toY(pnlData[hoverIndex])

      // Vertical line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.moveTo(hx, padTop)
      ctx.lineTo(hx, h - padBottom)
      ctx.stroke()
      ctx.setLineDash([])

      // Horizontal line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.moveTo(padLeft, hy)
      ctx.lineTo(w - padRight, hy)
      ctx.stroke()
      ctx.setLineDash([])

      // Dot
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

    // Find closest data point index
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
    <nav className="navbar">
      <Link to="/" className="navbar-home">Home</Link>
      <div className="navbar-balance">
        <div className="balance-display">${balance.toFixed(2)}</div>

        <div className="tx-wrapper" ref={logRef}>
          <button className="btn-transactions" onClick={() => { setLogOpen(!logOpen); setPnlOpen(false) }}>
            <span className="tx-icon">&#x1f4cb;</span>
            Log
          </button>
          {logOpen && (
            <div className="tx-panel">
              <div className="tx-panel-header">
                <span className="tx-panel-title">Transaction Log</span>
                {transactions.length > 0 && (
                  <button className="tx-clear" onClick={onClearTransactions}>Clear</button>
                )}
              </div>
              <div className="tx-panel-summary">
                <span>Net Profit</span>
                <span className={totalProfit >= 0 ? 'tx-positive' : 'tx-negative'}>
                  {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)}
                </span>
              </div>
              <div className="tx-panel-list">
                {transactions.length === 0 && (
                  <div className="tx-empty">No transactions yet</div>
                )}
                {transactions.map((tx, i) => (
                  <div key={i} className="tx-row">
                    <div className="tx-row-left">
                      <span className="tx-game">{tx.game}</span>
                      <span className="tx-time">{formatTime(tx.time)}</span>
                    </div>
                    <span className={`tx-amount ${tx.amount >= 0 ? 'tx-positive' : 'tx-negative'}`}>
                      {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="tx-wrapper" ref={pnlRef}>
          <button className="btn-pnl" onClick={() => { setPnlOpen(!pnlOpen); setLogOpen(false) }}>
            PNL
          </button>
          {pnlOpen && (
            <div className="pnl-panel">
              <div className="tx-panel-header">
                <span className="tx-panel-title">Profit &amp; Loss</span>
              </div>
              <div className="pnl-stats">
                <div className="pnl-stat">
                  <span className="pnl-stat-label">Net P&amp;L</span>
                  <span className={`pnl-stat-value ${totalProfit >= 0 ? 'tx-positive' : 'tx-negative'}`}>
                    {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)}
                  </span>
                </div>
                <div className="pnl-stat">
                  <span className="pnl-stat-label">Return</span>
                  <span className={`pnl-stat-value ${pnlPercent >= 0 ? 'tx-positive' : 'tx-negative'}`}>
                    {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="pnl-chart">
                {pnlData.length < 2 ? (
                  <div className="tx-empty">Play a game to see your PNL chart</div>
                ) : (
                  <div className="pnl-chart-container">
                    <canvas
                      ref={canvasRef}
                      width={560}
                      height={240}
                      className="pnl-canvas"
                      onMouseMove={handleCanvasMouseMove}
                      onMouseLeave={handleCanvasMouseLeave}
                    />
                    {hoverInfo && (
                      <div
                        className="pnl-tooltip"
                        style={{ left: `${hoverInfo.x}px` }}
                      >
                        <span className="pnl-tooltip-game">Game #{hoverInfo.index}</span>
                        <span className={`pnl-tooltip-value ${hoverInfo.value >= 0 ? 'tx-positive' : 'tx-negative'}`}>
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

        <button className="btn-reset" onClick={handleReset}>Reset Balance</button>
      </div>
    </nav>
  )
}
