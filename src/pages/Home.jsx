import { useState } from 'react'
import { Link } from 'react-router-dom'

const games = [
  { path: '/blackjack', name: 'Blackjack', icon: '🃏', gradient: 'linear-gradient(135deg, #3a7d5c 0%, #2d6348 100%)', desc: 'Beat the dealer to 21', tag: 'Cards' },
  { path: '/roulette', name: 'Roulette', icon: '🎰', gradient: 'linear-gradient(135deg, #c45b5b 0%, #a34545 100%)', desc: 'Spin the wheel, pick your number', tag: 'Classic' },
  { path: '/crash', name: 'Crash', icon: '📈', gradient: 'linear-gradient(135deg, #4a80b0 0%, #3a6890 100%)', desc: 'Cash out before it crashes', tag: 'Trending' },
  { path: '/mines', name: 'Mines', icon: '💣', gradient: 'linear-gradient(135deg, #b09060 0%, #8a7048 100%)', desc: 'Reveal tiles, avoid the mines', tag: 'Strategy' },
  { path: '/plinko', name: 'Plinko', icon: '⚪', gradient: 'linear-gradient(135deg, #8a60b0 0%, #6e4a90 100%)', desc: 'Drop the ball, hit a multiplier', tag: 'Luck' },
]

const categories = ['All Games', 'Blackjack', 'Roulette', 'Crash', 'Mines', 'Plinko']

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All Games')

  const filteredGames = activeCategory === 'All Games'
    ? games
    : games.filter(g => g.name === activeCategory)

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Promotional Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-secondary via-tertiary to-secondary p-8 md:p-12">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-accent/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
                Welcome to <span className="text-accent italic" style={{ textShadow: '0 0 10px rgba(0,231,1,0.6), 0 0 30px rgba(0,231,1,0.3), 0 0 60px rgba(0,231,1,0.15)' }}>Take</span>
              </h1>
              <p className="text-text-secondary text-base md:text-lg max-w-lg">
                Play with fake money. No risk, all fun. Try our original casino games and experience the thrill.
              </p>
            </div>
            <Link to="/blackjack" className="bg-accent hover:bg-accent-hover text-primary font-bold px-8 py-3 rounded-xl text-sm transition-colors shrink-0 no-underline">
              Play Now
            </Link>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border-none cursor-pointer ${
              activeCategory === cat
                ? 'bg-accent text-primary'
                : 'bg-tertiary text-text-secondary hover:text-white'
            }`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Originals Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-accent">&#9670;</span> Originals
          </h2>
          <button className="text-sm text-text-muted hover:text-accent transition-colors bg-transparent border-none cursor-pointer flex items-center gap-1">
            View All <span>&rsaquo;</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredGames.map(g => (
            <Link
              key={g.path}
              to={g.path}
              className="group bg-secondary rounded-xl overflow-hidden border border-white/5 hover:border-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 no-underline"
            >
              <div className="h-32 flex items-center justify-center relative" style={{ background: g.gradient }}>
                <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">{g.icon}</span>
                <span className="absolute top-2 left-2 bg-black/30 backdrop-blur-sm text-white/80 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wide">
                  {g.tag}
                </span>
              </div>
              <div className="p-3">
                <div className="font-bold text-sm text-white">{g.name}</div>
                <div className="text-xs text-text-muted mt-1">{g.desc}</div>
              </div>
              <div className="px-3 pb-3 flex items-center justify-between text-xs font-semibold text-text-muted group-hover:text-accent transition-colors">
                <span>Play Now</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Section */}
      {activeCategory === 'All Games' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-warning">&#9733;</span> Popular
            </h2>
            <button className="text-sm text-text-muted hover:text-accent transition-colors bg-transparent border-none cursor-pointer flex items-center gap-1">
              View All <span>&rsaquo;</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...games].reverse().map(g => (
              <Link
                key={g.path + '-pop'}
                to={g.path}
                className="group bg-secondary rounded-xl overflow-hidden border border-white/5 hover:border-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 no-underline"
              >
                <div className="h-32 flex items-center justify-center relative" style={{ background: g.gradient }}>
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">{g.icon}</span>
                  <span className="absolute top-2 right-2 bg-accent/20 text-accent text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                    Originals
                  </span>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-white">{g.name}</div>
                  <div className="text-xs text-text-muted mt-1">{g.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
