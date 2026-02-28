import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const games = [
  { path: '/blackjack', name: 'Blackjack', icon: '🃏' },
  { path: '/roulette', name: 'Roulette', icon: '🎰' },
  { path: '/crash', name: 'Crash', icon: '📈' },
  { path: '/mines', name: 'Mines', icon: '💣' },
  { path: '/plinko', name: 'Plinko', icon: '⚪' },
]

export default function Sidebar() {
  const [gamesOpen, setGamesOpen] = useState(true)
  const [sportsOpen, setSportsOpen] = useState(false)

  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-logo">Take</NavLink>
      <div className="sidebar-divider" />
      <div className="sidebar-section">
        <div className="sidebar-section-header" onClick={() => setGamesOpen(!gamesOpen)}>
          <span className="sidebar-section-title">Games</span>
          <span className={`sidebar-chevron ${gamesOpen ? 'open' : ''}`}>▼</span>
        </div>
        <div className={`sidebar-links ${gamesOpen ? '' : 'collapsed'}`}>
          {games.map(g => (
            <NavLink
              key={g.path}
              to={g.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{g.icon}</span>
              {g.name}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-header" onClick={() => setSportsOpen(!sportsOpen)}>
          <span className="sidebar-section-title">Sports Book</span>
          <span className={`sidebar-chevron ${sportsOpen ? 'open' : ''}`}>▼</span>
        </div>
        <div className={`sidebar-links ${sportsOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-coming-soon">Coming Soon...</div>
        </div>
      </div>
    </aside>
  )
}
