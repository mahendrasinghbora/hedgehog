import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Bet, Market } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BetWithMarket extends Bet {
  market?: Market
}

export default function Profile() {
  const { user } = useAuth()
  const [bets, setBets] = useState<BetWithMarket[]>([])
  const [stats, setStats] = useState({
    totalBets: 0,
    marketsCreated: 0,
    wins: 0,
    losses: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    // Fetch user's bets
    const betsQuery = query(
      collection(db, 'bets'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    )

    const unsubscribeBets = onSnapshot(betsQuery, async (snapshot) => {
      const betData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bet[]

      // Fetch market details for each bet
      const betsWithMarkets = await Promise.all(
        betData.map(async (bet) => {
          const marketDoc = await getDoc(doc(db, 'markets', bet.marketId))
          if (marketDoc.exists()) {
            return {
              ...bet,
              market: { id: marketDoc.id, ...marketDoc.data() } as Market,
            }
          }
          return bet
        })
      )

      setBets(betsWithMarkets)

      // Calculate stats
      let wins = 0
      let losses = 0
      betsWithMarkets.forEach((bet) => {
        if (bet.market?.status === 'resolved') {
          if (bet.market.resolvedOutcomeId === bet.outcomeId) {
            wins++
          } else {
            losses++
          }
        }
      })

      setStats((prev) => ({
        ...prev,
        totalBets: betData.length,
        wins,
        losses,
      }))

      setLoading(false)
    })

    // Fetch markets created by user
    const marketsQuery = query(
      collection(db, 'markets'),
      where('creatorId', '==', user.id)
    )

    const unsubscribeMarkets = onSnapshot(marketsQuery, (snapshot) => {
      setStats((prev) => ({
        ...prev,
        marketsCreated: snapshot.docs.length,
      }))
    })

    return () => {
      unsubscribeBets()
      unsubscribeMarkets()
    }
  }, [user])

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please sign in to view your profile</p>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  const winRate =
    stats.wins + stats.losses > 0
      ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
      : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{user.displayName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-2xl font-bold mt-2">{user.coins} coins</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{stats.totalBets}</p>
            <p className="text-sm text-muted-foreground">Total Bets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{stats.marketsCreated}</p>
            <p className="text-sm text-muted-foreground">Markets Created</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.wins}</p>
            <p className="text-sm text-muted-foreground">Wins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{winRate}%</p>
            <p className="text-sm text-muted-foreground">Win Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bet History</CardTitle>
        </CardHeader>
        <CardContent>
          {bets.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No bets yet. Start predicting!
            </p>
          ) : (
            <div className="space-y-3">
              {bets.map((bet) => {
                const outcome = bet.market?.outcomes.find(
                  (o) => o.id === bet.outcomeId
                )
                const isWin =
                  bet.market?.status === 'resolved' &&
                  bet.market.resolvedOutcomeId === bet.outcomeId
                const isLoss =
                  bet.market?.status === 'resolved' &&
                  bet.market.resolvedOutcomeId !== bet.outcomeId

                return (
                  <Link
                    key={bet.id}
                    to={`/market/${bet.marketId}`}
                    className="block"
                  >
                    <div className="p-3 rounded-lg border hover:bg-accent transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {bet.market?.title || 'Unknown Market'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Bet on: {outcome?.label || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{bet.amount} coins</p>
                          {bet.market?.status === 'resolved' && (
                            <Badge
                              className={
                                isWin
                                  ? 'bg-green-500'
                                  : isLoss
                                  ? 'bg-red-500'
                                  : 'bg-gray-500'
                              }
                            >
                              {isWin ? 'Won' : 'Lost'}
                            </Badge>
                          )}
                          {bet.market?.status === 'open' && (
                            <Badge className="bg-blue-500">Active</Badge>
                          )}
                          {bet.market?.status === 'closed' && (
                            <Badge className="bg-yellow-500">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
