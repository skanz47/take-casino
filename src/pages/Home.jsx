import { Link } from 'react-router-dom'

const games = [
  { path: '/blackjack', name: 'Blackjack', icon: '🃏', gradient: 'linear-gradient(135deg, #3a7d5c 0%, #2d6348 100%)', desc: 'Beat the dealer to 21', tag: 'Cards' },
  { path: '/roulette', name: 'Roulette', icon: '🎰', gradient: 'linear-gradient(135deg, #c45b5b 0%, #a34545 100%)', desc: 'Spin the wheel, pick your number', tag: 'Classic' },
  { path: '/crash', name: 'Crash', icon: '📈', gradient: 'linear-gradient(135deg, #4a80b0 0%, #3a6890 100%)', desc: 'Cash out before it crashes', tag: 'Trending' },
  { path: '/mines', name: 'Mines', icon: '💣', gradient: 'linear-gradient(135deg, #b09060 0%, #8a7048 100%)', desc: 'Reveal tiles, avoid the mines', tag: 'Strategy' },
  { path: '/plinko', name: 'Plinko', icon: '⚪', gradient: 'linear-gradient(135deg, #8a60b0 0%, #6e4a90 100%)', desc: 'Drop the ball, hit a multiplier', tag: 'Luck' },
]

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-title">Welcome to <span className="home-brand">Take</span></h1>
          <p className="home-subtitle">Play with fake money. No risk, all fun.</p>
        </div>
        <div className="home-hero-glow" />
      </div>

      <div className="home-section-header">
        <span className="home-section-label">Games</span>
        <span className="home-section-line" />
      </div>

      <div className="game-grid">
        {games.map((g, i) => (
          <Link key={g.path} to={g.path} className={`game-card ${i < 3 ? 'game-card-top' : 'game-card-bottom'}`}>
            <div className="game-card-banner" style={{ background: g.gradient }}>
              <span className="game-card-icon">{g.icon}</span>
              <span className="game-card-tag">{g.tag}</span>
            </div>
            <div className="game-card-body">
              <div className="game-card-title">{g.name}</div>
              <div className="game-card-desc">{g.desc}</div>
            </div>
            <div className="game-card-play">
              <span>Play Now</span>
              <span className="game-card-arrow">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
