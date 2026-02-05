import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User, Bet, Market } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import Avatar from '@/components/Avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UserStats {
  totalBets: number
  wins: number
  losses: number
  winRate: number
}

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('coins', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(userData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const getMedal = (index: number) => {
    switch (index) {
      case 0:
        return '🥇'
      case 1:
        return '🥈'
      case 2:
        return '🥉'
      default:
        return `#${index + 1}`
    }
  }

  const handleUserClick = async (user: User) => {
    setSelectedUser(user)
    setLoadingStats(true)
    setUserStats(null)

    try {
      // Fetch user's bets
      const betsQuery = query(
        collection(db, 'bets'),
        where('userId', '==', user.id)
      )
      const betsSnapshot = await getDocs(betsQuery)
      const bets = betsSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Bet[]

      // Calculate wins/losses
      let wins = 0
      let losses = 0

      for (const bet of bets) {
        const marketDoc = await getDoc(doc(db, 'markets', bet.marketId))
        if (marketDoc.exists()) {
          const market = marketDoc.data() as Market
          if (market.status === 'resolved') {
            if (market.resolvedOutcomeId === bet.outcomeId) {
              wins++
            } else {
              losses++
            }
          }
        }
      }

      const totalBets = bets.length
      const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0

      setUserStats({ totalBets, wins, losses, winRate })
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  const currentUserRank = users.findIndex((u) => u.id === currentUser?.id) + 1

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Top predictors by coins</p>
      </div>

      {currentUser && currentUserRank > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold w-10">
                  #{currentUserRank}
                </span>
                <span className="font-medium">You</span>
              </div>
              <span className="font-bold">{currentUser.coins} coins</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No users yet
            </p>
          ) : (
            <div className="space-y-1">
              {users.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className={`w-full flex items-center justify-between py-3 px-2 rounded-lg transition-colors hover:bg-accent ${
                    user.id === currentUser?.id
                      ? 'bg-primary/10'
                      : index % 2 === 0
                      ? 'bg-muted/50'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-10">
                      {getMedal(index)}
                    </span>
                    <Avatar seed={user.id} styleId={user.avatarId} size={32} />
                    <span
                      className={`font-medium ${
                        user.id === currentUser?.id ? 'text-primary' : ''
                      }`}
                    >
                      {user.displayName}
                      {user.id === currentUser?.id && ' (You)'}
                    </span>
                  </div>
                  <span className="font-bold">{user.coins}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Player Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar seed={selectedUser.id} styleId={selectedUser.avatarId} size={64} />
                <div>
                  <p className="text-lg font-bold">{selectedUser.displayName}</p>
                  {selectedUser.handle && (
                    <p className="text-sm text-primary">@{selectedUser.handle}</p>
                  )}
                </div>
              </div>

              <div className="text-2xl font-bold text-center py-2">
                {selectedUser.coins} coins
              </div>

              {loadingStats ? (
                <p className="text-center text-muted-foreground py-4">Loading stats...</p>
              ) : userStats ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{userStats.totalBets}</p>
                    <p className="text-xs text-muted-foreground">Total Bets</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{userStats.winRate}%</p>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{userStats.wins}</p>
                    <p className="text-xs text-muted-foreground">Wins</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{userStats.losses}</p>
                    <p className="text-xs text-muted-foreground">Losses</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
