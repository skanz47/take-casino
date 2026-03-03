import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

const games = [
  { path: '/blackjack', name: 'Blackjack', icon: '🃏' },
  { path: '/roulette', name: 'Roulette', icon: '🎰' },
  { path: '/crash', name: 'Crash', icon: '📈' },
  { path: '/mines', name: 'Mines', icon: '💣' },
  { path: '/plinko', name: 'Plinko', icon: '⚪' },
]

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const [gamesOpen, setGamesOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('casino')

  const linkBase = 'flex items-center gap-3 px-4 py-2.5 mx-3 rounded-lg text-text-secondary hover:bg-tertiary hover:text-white transition-all text-sm font-medium no-underline'
  const activeLink = 'bg-accent/10 text-accent'

  return (
    <aside className={`fixed top-0 left-0 w-[260px] h-screen bg-secondary border-r border-tertiary overflow-y-auto z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      {/* Logo */}
      <Link to="/" className="block text-center py-5 px-4 no-underline" onClick={() => setSidebarOpen(false)}>
        <span className="text-3xl font-black italic text-white tracking-tight" style={{ textShadow: '0 0 10px rgba(0,231,1,0.4), 0 0 30px rgba(0,231,1,0.2)' }}>
          Take
        </span>
      </Link>

      {/* Casino / Sports Toggle */}
      <div className="flex bg-primary rounded-lg p-1 mx-4 mb-4">
        <button
          className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'casino' ? 'bg-accent text-primary' : 'text-text-secondary hover:text-white'}`}
          onClick={() => setActiveTab('casino')}
        >
          Casino
        </button>
        <button
          className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'sports' ? 'bg-accent text-primary' : 'text-text-secondary hover:text-white'}`}
          onClick={() => setActiveTab('sports')}
        >
          Sports
        </button>
      </div>

      {/* Sports Coming Soon */}
      {activeTab === 'sports' && (
        <div className="mx-4 mb-4 p-6 bg-primary rounded-xl text-center">
          <div className="text-3xl mb-2">🏀</div>
          <div className="text-sm font-bold text-white mb-1">Coming Soon</div>
          <div className="text-xs text-text-muted">Sports betting is on the way. Stay tuned!</div>
        </div>
      )}

      {/* Casino Content */}
      {activeTab === 'casino' && (
        <>
          {/* All Games Link */}
          <div className="mb-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-lg w-6 text-center">🎮</span>
              All Games
            </NavLink>
          </div>

          <div className="h-px bg-tertiary mx-5 my-3" />

          {/* Games Section */}
          <div className="px-3 mb-2">
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg hover:bg-tertiary/50 transition-colors select-none"
              onClick={() => setGamesOpen(!gamesOpen)}
            >
              <span className="text-[11px] uppercase tracking-widest text-text-muted font-bold">Games</span>
              <span className={`text-text-muted text-xs transition-transform duration-200 ${gamesOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>
            <div className={`sidebar-links ${gamesOpen ? '' : 'collapsed'}`}>
              {games.map(g => (
                <NavLink
                  key={g.path}
                  to={g.path}
                  className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-lg w-6 text-center">{g.icon}</span>
                  {g.name}
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
