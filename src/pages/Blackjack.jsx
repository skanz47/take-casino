import { useState, useCallback, useRef } from 'react'
import BetControls from '../components/BetControls'
import { getBalance, setBalance } from '../utils/balance'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function createShoe(decks = 6) {
  const shoe = []
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit })
      }
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]]
  }
  return shoe
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10
  if (card.rank === 'A') return 11
  return parseInt(card.rank)
}

function handValue(hand) {
  let total = 0
  let aces = 0
  for (const card of hand) {
    total += cardValue(card)
    if (card.rank === 'A') aces++
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21
}

function isRed(suit) {
  return suit === '♥' || suit === '♦'
}

function CardComponent({ card, hidden, index = 0, flipping = false }) {
  const delay = index * 0.15

  if (hidden) {
    return (
      <div
        className="w-16 h-[90px] bg-gradient-to-br from-blue-800 to-blue-600 rounded-lg flex flex-col items-center justify-center text-white text-2xl font-bold shadow-md bj-card-enter"
        style={{ animationDelay: `${delay}s` }}
      >
        ?
      </div>
    )
  }

  if (flipping) {
    return (
      <div className="bj-card-flip-container">
        <div className="bj-card-flip">
          <div className="bj-card-flip-back w-16 h-[90px] bg-gradient-to-br from-blue-800 to-blue-600 rounded-lg flex flex-col items-center justify-center text-white text-2xl font-bold shadow-md">?</div>
          <div className={`bj-card-flip-front w-16 h-[90px] bg-white rounded-lg flex flex-col items-center justify-center text-lg font-bold shadow-md ${isRed(card.suit) ? 'text-red-600' : 'text-gray-900'}`}>
            <div>{card.rank}</div>
            <div>{card.suit}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-16 h-[90px] bg-white rounded-lg flex flex-col items-center justify-center text-lg font-bold shadow-md bj-card-enter ${isRed(card.suit) ? 'text-red-600' : 'text-gray-900'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div>{card.rank}</div>
      <div>{card.suit}</div>
    </div>
  )
}

export default function Blackjack({ balance, refreshBalance, addTransaction }) {
  const [bet, setBet] = useState('5.00')
  const [shoe, setShoe] = useState(() => createShoe())
  const [shoeIndex, setShoeIndex] = useState(0)
  const [playerHands, setPlayerHands] = useState([[]])
  const [activeHandIndex, setActiveHandIndex] = useState(0)
  const [dealerHand, setDealerHand] = useState([])
  const [phase, setPhase] = useState('betting')
  const [results, setResults] = useState([])
  const [betAmounts, setBetAmounts] = useState([0])
  const [dealerFlipping, setDealerFlipping] = useState(false)
  const dealKeyRef = useRef(0)
  const [dealKey, setDealKey] = useState(0)

  const draw = useCallback((currentShoe, currentIndex) => {
    if (currentIndex >= currentShoe.length - 10) {
      const newShoe = createShoe()
      setShoe(newShoe)
      setShoeIndex(1)
      return [newShoe[0], newShoe, 1]
    }
    return [currentShoe[currentIndex], currentShoe, currentIndex + 1]
  }, [])

  const deal = () => {
    const numBet = parseFloat(bet)
    if (!numBet || numBet <= 0 || numBet > balance) return

    const bal = getBalance()
    setBalance(bal - numBet)
    refreshBalance()

    let s = shoe
    let idx = shoeIndex
    const cards = []
    for (let i = 0; i < 4; i++) {
      const [card, ns, ni] = draw(s, idx)
      cards.push(card)
      s = ns
      idx = ni
    }
    setShoe(s)
    setShoeIndex(idx)

    const pHand = [cards[0], cards[2]]
    const dHand = [cards[1], cards[3]]

    setPlayerHands([pHand])
    setDealerHand(dHand)
    setBetAmounts([numBet])
    setResults([])
    setActiveHandIndex(0)
    setDealerFlipping(false)
    dealKeyRef.current++
    setDealKey(dealKeyRef.current)

    if (isBlackjack(pHand)) {
      finishRound([pHand], dHand, [numBet], s, idx)
    } else {
      setPhase('playing')
    }
  }

  const hit = () => {
    const [card, ns, ni] = draw(shoe, shoeIndex)
    setShoe(ns)
    setShoeIndex(ni)

    const newHands = [...playerHands]
    newHands[activeHandIndex] = [...newHands[activeHandIndex], card]
    setPlayerHands(newHands)

    if (handValue(newHands[activeHandIndex]) >= 21) {
      moveToNextHand(newHands, betAmounts, ns, ni)
    }
  }

  const stand = () => {
    moveToNextHand(playerHands, betAmounts, shoe, shoeIndex)
  }

  const doubleDown = () => {
    const numBet = betAmounts[activeHandIndex]
    const bal = getBalance()
    if (bal < numBet) return

    setBalance(bal - numBet)
    refreshBalance()

    const newBets = [...betAmounts]
    newBets[activeHandIndex] = numBet * 2
    setBetAmounts(newBets)

    const [card, ns, ni] = draw(shoe, shoeIndex)
    setShoe(ns)
    setShoeIndex(ni)

    const newHands = [...playerHands]
    newHands[activeHandIndex] = [...newHands[activeHandIndex], card]
    setPlayerHands(newHands)

    moveToNextHand(newHands, newBets, ns, ni)
  }

  const split = () => {
    const hand = playerHands[activeHandIndex]
    if (hand.length !== 2 || cardValue(hand[0]) !== cardValue(hand[1])) return

    const numBet = betAmounts[activeHandIndex]
    const bal = getBalance()
    if (bal < numBet) return

    setBalance(bal - numBet)
    refreshBalance()

    const [card1, s1, i1] = draw(shoe, shoeIndex)
    const [card2, s2, i2] = draw(s1, i1)
    setShoe(s2)
    setShoeIndex(i2)

    const newHands = [...playerHands]
    newHands[activeHandIndex] = [hand[0], card1]
    newHands.splice(activeHandIndex + 1, 0, [hand[1], card2])

    const newBets = [...betAmounts]
    newBets.splice(activeHandIndex + 1, 0, numBet)

    setPlayerHands(newHands)
    setBetAmounts(newBets)

    if (handValue(newHands[activeHandIndex]) === 21) {
      moveToNextHandAfterSplit(newHands, newBets, activeHandIndex, s2, i2)
    }
  }

  const moveToNextHandAfterSplit = (hands, bets, currentIdx, s, idx) => {
    const next = currentIdx + 1
    if (next < hands.length) {
      setActiveHandIndex(next)
      if (handValue(hands[next]) === 21) {
        moveToNextHandAfterSplit(hands, bets, next, s, idx)
      }
    } else {
      finishRound(hands, dealerHand, bets, s, idx)
    }
  }

  const moveToNextHand = (hands, bets, s, idx) => {
    const next = activeHandIndex + 1
    if (next < hands.length) {
      setActiveHandIndex(next)
    } else {
      finishRound(hands, dealerHand, bets, s, idx)
    }
  }

  const finishRound = (pHands, dHand, bets, s, idx) => {
    setPhase('dealer')
    setDealerFlipping(true)

    setTimeout(() => {
      let currentDealerHand = [...dHand]
      let cs = s
      let ci = idx
      while (handValue(currentDealerHand) < 17) {
        const [card, ns, ni] = draw(cs, ci)
        currentDealerHand.push(card)
        cs = ns
        ci = ni
      }
      setShoe(cs)
      setShoeIndex(ci)
      setDealerHand(currentDealerHand)
      setDealerFlipping(false)

      const dealerVal = handValue(currentDealerHand)
      const dealerBJ = isBlackjack(dHand)
      let totalWin = 0
      const roundResults = []

      for (let i = 0; i < pHands.length; i++) {
        const pVal = handValue(pHands[i])
        const pBJ = isBlackjack(pHands[i]) && pHands.length === 1
        const betAmt = bets[i]

        if (pVal > 21) {
          roundResults.push('lose')
        } else if (pBJ && dealerBJ) {
          roundResults.push('push')
          totalWin += betAmt
        } else if (pBJ) {
          roundResults.push('blackjack')
          totalWin += betAmt + betAmt * 1.5
        } else if (dealerBJ) {
          roundResults.push('lose')
        } else if (dealerVal > 21) {
          roundResults.push('win')
          totalWin += betAmt * 2
        } else if (pVal > dealerVal) {
          roundResults.push('win')
          totalWin += betAmt * 2
        } else if (pVal === dealerVal) {
          roundResults.push('push')
          totalWin += betAmt
        } else {
          roundResults.push('lose')
        }
      }

      if (totalWin > 0) {
        const bal = getBalance()
        setBalance(bal + totalWin)
      }
      const totalBet = bets.reduce((s, b) => s + b, 0)
      const netProfit = totalWin - totalBet
      addTransaction('Blackjack', netProfit)
      refreshBalance()
      setResults(roundResults)
      setPhase('done')
    }, 600)
  }

  const canSplit = phase === 'playing' && playerHands[activeHandIndex]?.length === 2 &&
    cardValue(playerHands[activeHandIndex][0]) === cardValue(playerHands[activeHandIndex][1]) &&
    getBalance() >= betAmounts[activeHandIndex]

  const canDouble = phase === 'playing' && playerHands[activeHandIndex]?.length === 2 &&
    getBalance() >= betAmounts[activeHandIndex]

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Blackjack</h2>

      {phase === 'betting' && (
        <>
          <BetControls bet={bet} setBet={setBet} balance={balance} />
          <button
            className="bg-accent hover:bg-accent-hover text-primary px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={deal}
            disabled={!parseFloat(bet) || parseFloat(bet) > balance}
          >
            Deal
          </button>
        </>
      )}

      {phase !== 'betting' && (
        <div className="bg-secondary rounded-2xl p-6 mb-4">
          <div className="mb-5">
            <div className="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
              Dealer {(phase === 'done') ? `(${handValue(dealerHand)})` : ''}
            </div>
            <div className="flex gap-2 flex-wrap">
              {dealerHand.map((card, i) => (
                <CardComponent
                  key={`${dealKey}-d-${i}`}
                  card={card}
                  hidden={i === 1 && phase === 'playing'}
                  index={i}
                  flipping={i === 1 && dealerFlipping}
                />
              ))}
            </div>
          </div>

          {playerHands.map((hand, hIdx) => (
            <div className="mb-5" key={hIdx}>
              <div className="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                {playerHands.length > 1 ? `Hand ${hIdx + 1}` : 'Your Hand'} ({handValue(hand)})
                {hIdx === activeHandIndex && phase === 'playing' && ' ◀'}
              </div>
              <div className="flex gap-2 flex-wrap">
                {hand.map((card, i) => (
                  <CardComponent key={`${dealKey}-p${hIdx}-${i}`} card={card} index={i} />
                ))}
              </div>
              {phase === 'done' && results[hIdx] && (
                <div className={`p-3 rounded-lg font-semibold my-3 text-sm ${results[hIdx] === 'win' || results[hIdx] === 'blackjack'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : results[hIdx] === 'push'
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                      : 'bg-red-500/10 text-danger border border-red-500/30'
                  }`}>
                  {results[hIdx] === 'blackjack' && `Blackjack! +$${(betAmounts[hIdx] * 1.5).toFixed(2)}`}
                  {results[hIdx] === 'win' && `Win! +$${betAmounts[hIdx].toFixed(2)}`}
                  {results[hIdx] === 'push' && 'Push - Bet returned'}
                  {results[hIdx] === 'lose' && `Lost $${betAmounts[hIdx].toFixed(2)}`}
                </div>
              )}
            </div>
          ))}

          {phase === 'playing' && (
            <div className="flex gap-2 flex-wrap">
              <button className="bg-accent hover:bg-accent-hover text-primary px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer" onClick={hit}>Hit</button>
              <button className="bg-tertiary hover:bg-tertiary/80 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer" onClick={stand}>Stand</button>
              <button className="bg-warning hover:opacity-85 text-primary px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" onClick={doubleDown} disabled={!canDouble}>Double</button>
              <button className="bg-tertiary hover:bg-tertiary/80 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" onClick={split} disabled={!canSplit}>Split</button>
            </div>
          )}

          {phase === 'done' && (
            <button
              className="bg-accent hover:bg-accent-hover text-primary px-6 py-2.5 rounded-lg font-bold text-sm transition-colors border-none cursor-pointer mt-3"
              onClick={() => setPhase('betting')}
            >
              New Hand
            </button>
          )}
        </div>
      )}
    </div>
  )
}
