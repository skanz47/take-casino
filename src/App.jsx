import { useState, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Blackjack from './pages/Blackjack'
import Roulette from './pages/Roulette'
import Crash from './pages/Crash'
import Mines from './pages/Mines'
import Plinko from './pages/Plinko'
import { getBalance } from './utils/balance'
import { getTransactions, addTransaction as addTx, clearTransactions } from './utils/transactions'

export default function App() {
  const [balance, setBalance] = useState(getBalance())
  const [transactions, setTransactions] = useState(getTransactions())

  const refreshBalance = useCallback(() => {
    setBalance(getBalance())
  }, [])

  const addTransaction = useCallback((game, amount) => {
    addTx(game, amount)
    setTransactions(getTransactions())
  }, [])

  const handleClearTransactions = useCallback(() => {
    clearTransactions()
    setTransactions([])
  }, [])

  return (
    <div className="app">
      <Sidebar />
      <div className="main-area">
        <Navbar balance={balance} refreshBalance={refreshBalance} transactions={transactions} onClearTransactions={handleClearTransactions} />
        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blackjack" element={<Blackjack balance={balance} refreshBalance={refreshBalance} addTransaction={addTransaction} />} />
            <Route path="/roulette" element={<Roulette balance={balance} refreshBalance={refreshBalance} addTransaction={addTransaction} />} />
            <Route path="/crash" element={<Crash balance={balance} refreshBalance={refreshBalance} addTransaction={addTransaction} />} />
            <Route path="/mines" element={<Mines balance={balance} refreshBalance={refreshBalance} addTransaction={addTransaction} />} />
            <Route path="/plinko" element={<Plinko balance={balance} refreshBalance={refreshBalance} addTransaction={addTransaction} />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
