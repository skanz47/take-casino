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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    <div className="flex min-h-screen bg-primary">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <Navbar
          balance={balance}
          refreshBalance={refreshBalance}
          transactions={transactions}
          onClearTransactions={handleClearTransactions}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 p-4 md:p-6 mt-16">
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
