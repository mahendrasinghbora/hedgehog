import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Market, Bet } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, updateCoins } = useAuth()
  const navigate = useNavigate()
  const [market, setMarket] = useState<Market | null>(null)
  const [bets, setBets] = useState<Bet[]>([])
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return

    const unsubscribe = onSnapshot(doc(db, 'markets', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setMarket({
          id: docSnap.id,
          ...data,
          deadline: data.deadline instanceof Timestamp ? data.deadline.toDate() : new Date(data.deadline),
        } as Market)
      }
    })

    const q = query(collection(db, 'bets'), where('marketId', '==', id))
    const unsubscribeBets = onSnapshot(q, (snapshot) => {
      const betData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bet[]
      setBets(betData)
    })

    return () => {
      unsubscribe()
      unsubscribeBets()
    }
  }, [id])

  const isDeadlinePassed = market ? new Date() > new Date(market.deadline) : false
  const canBet = market?.status === 'open' && !isDeadlinePassed

  const placeBet = async () => {
    if (!user || !market || !selectedOutcome || !betAmount || !canBet) return
    const amount = parseInt(betAmount)
    if (amount <= 0 || amount > user.coins) return

    setLoading(true)
    try {
      await addDoc(collection(db, 'bets'), {
        marketId: market.id,
        outcomeId: selectedOutcome,
        userId: user.id,
        userName: user.displayName,
        amount,
        createdAt: new Date(),
      })

      const outcomeIndex = market.outcomes.findIndex((o) => o.id === selectedOutcome)
      const updatedOutcomes = [...market.outcomes]
      updatedOutcomes[outcomeIndex] = {
        ...updatedOutcomes[outcomeIndex],
        totalBets: updatedOutcomes[outcomeIndex].totalBets + amount,
      }

      await updateDoc(doc(db, 'markets', market.id), {
        outcomes: updatedOutcomes,
        totalPool: increment(amount),
      })

      await updateCoins(user.coins - amount)

      setBetAmount('')
      setSelectedOutcome(null)
    } catch (error) {
      console.error('Failed to place bet:', error)
    } finally {
      setLoading(false)
    }
  }

  const closeBetting = async () => {
    if (!market || market.creatorId !== user?.id) return

    setLoading(true)
    try {
      await updateDoc(doc(db, 'markets', market.id), {
        status: 'closed',
      })
    } catch (error) {
      console.error('Failed to close betting:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveMarket = async (outcomeId: string) => {
    if (!market || market.creatorId !== user?.id) return

    setLoading(true)
    try {
      await updateDoc(doc(db, 'markets', market.id), {
        status: 'resolved',
        resolvedOutcomeId: outcomeId,
      })

      // Distribute winnings
      const winningBets = bets.filter((b) => b.outcomeId === outcomeId)
      const winningOutcome = market.outcomes.find((o) => o.id === outcomeId)!
      const losingPool = market.totalPool - winningOutcome.totalBets

      for (const bet of winningBets) {
        const shareOfPool = bet.amount / winningOutcome.totalBets
        const winnings = Math.floor(bet.amount + losingPool * shareOfPool)

        await updateDoc(doc(db, 'users', bet.userId), {
          coins: increment(winnings),
        })
      }

      navigate('/')
    } catch (error) {
      console.error('Failed to resolve market:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!market) {
    return <div className="text-center py-8">Loading...</div>
  }

  const isCreator = user?.id === market.creatorId
  const userBets = bets.filter((b) => b.userId === user?.id)

  const formatDeadline = (date: Date) => {
    return new Date(date).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl">{market.title}</CardTitle>
            <Badge
              className={
                market.status === 'open' && !isDeadlinePassed
                  ? 'bg-green-500'
                  : market.status === 'closed' || isDeadlinePassed
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }
            >
              {market.status === 'open' && isDeadlinePassed ? 'closed' : market.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {market.description && (
            <p className="text-muted-foreground">{market.description}</p>
          )}
          <div className="text-sm text-muted-foreground">
            Created by {market.creatorName}
          </div>
          <div className="text-sm text-muted-foreground">
            Deadline: {formatDeadline(market.deadline)}
            {isDeadlinePassed && <span className="text-yellow-600 ml-2">(passed)</span>}
          </div>
          <div className="font-medium">{market.totalPool} coins in pool</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Outcomes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {market.outcomes.map((outcome) => {
            const percentage =
              market.totalPool > 0
                ? Math.round((outcome.totalBets / market.totalPool) * 100)
                : 0

            return (
              <div
                key={outcome.id}
                className={`p-4 rounded-lg border transition-colors ${
                  canBet ? 'cursor-pointer' : ''
                } ${
                  selectedOutcome === outcome.id
                    ? 'border-primary bg-primary/5'
                    : canBet
                    ? 'hover:bg-accent'
                    : ''
                } ${
                  market.resolvedOutcomeId === outcome.id
                    ? 'border-green-500 bg-green-500/10'
                    : ''
                }`}
                onClick={() => canBet && setSelectedOutcome(outcome.id)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{outcome.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {outcome.totalBets} coins ({percentage}%)
                  </span>
                </div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {canBet && user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Place a Bet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Your balance: {user.coins} coins
            </div>
            {selectedOutcome ? (
              <div className="space-y-3">
                <div className="text-sm">
                  Betting on:{' '}
                  <strong>
                    {market.outcomes.find((o) => o.id === selectedOutcome)?.label}
                  </strong>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Amount"
                    min="1"
                    max={user.coins}
                  />
                  <Button onClick={placeBet} disabled={loading}>
                    {loading ? 'Placing...' : 'Place Bet'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select an outcome above to place a bet
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!canBet && market.status !== 'resolved' && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Betting is closed for this market.
          </CardContent>
        </Card>
      )}

      {userBets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userBets.map((bet) => (
                <div
                  key={bet.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <span>
                    {market.outcomes.find((o) => o.id === bet.outcomeId)?.label}
                  </span>
                  <span className="font-medium">{bet.amount} coins</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isCreator && market.status === 'open' && !isDeadlinePassed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Close Betting Early</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Stop accepting new bets before the deadline.
            </p>
            <Button variant="outline" onClick={closeBetting} disabled={loading}>
              Close Betting
            </Button>
          </CardContent>
        </Card>
      )}

      {isCreator && (market.status === 'closed' || isDeadlinePassed) && market.status !== 'resolved' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resolve Market</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select the winning outcome to resolve this market and distribute winnings.
            </p>
            <div className="flex flex-wrap gap-2">
              {market.outcomes.map((outcome) => (
                <Button
                  key={outcome.id}
                  variant="outline"
                  onClick={() => resolveMarket(outcome.id)}
                  disabled={loading}
                >
                  {outcome.label} wins
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
