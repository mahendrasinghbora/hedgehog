import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import CreateMarket from '@/pages/CreateMarket'
import MarketDetail from '@/pages/MarketDetail'
import GetStarted from '@/pages/GetStarted'
import Leaderboard from '@/pages/Leaderboard'
import Profile from '@/pages/Profile'
import Admin from '@/pages/Admin'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateMarket />
            </ProtectedRoute>
          }
        />
        <Route path="/market/:id" element={<MarketDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}

export default App
