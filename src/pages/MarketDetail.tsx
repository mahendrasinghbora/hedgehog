import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  increment,
  Timestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Market, Bet } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function formatTimeRemaining(deadline: Date): string {
  const now = new Date()
  const diff = new Date(deadline).getTime() - now.getTime()

  if (diff <= 0) return 'Deadline passed'

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} left`
  return 'Less than a minute left'
}

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [market, setMarket] = useState<Market | null>(null)
  const [bets, setBets] = useState<Bet[]>([])
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

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

  const handlePlaceBet = () => {
    if (!user || !betAmount) return
    const amount = parseInt(betAmount)

    // Show confirmation for large bets (>50% of balance)
    if (amount > user.coins * 0.5) {
      setShowConfirmDialog(true)
      return
    }

    placeBet()
  }

  const placeBet = async () => {
    if (!user || !market || !selectedOutcome || !betAmount || !canBet) return
    const amount = parseInt(betAmount)
    if (amount <= 0 || amount > user.coins) return

    setShowConfirmDialog(false)
    setLoading(true)
    try {
      await runTransaction(db, async (transaction) => {
        // Read current user coins to verify they still have enough
        const userRef = doc(db, 'users', user.id)
        const userDoc = await transaction.get(userRef)
        if (!userDoc.exists()) throw new Error('User not found')

        const currentCoins = userDoc.data().coins || 0
        if (currentCoins < amount) throw new Error('Insufficient coins')

        // Read current market state
        const marketRef = doc(db, 'markets', market.id)
        const marketDoc = await transaction.get(marketRef)
        if (!marketDoc.exists()) throw new Error('Market not found')

        const marketData = marketDoc.data()
        if (marketData.status !== 'open') throw new Error('Market is not open')

        // Update market outcomes and pool
        const outcomes = [...marketData.outcomes]
        const outcomeIndex = outcomes.findIndex((o: { id: string }) => o.id === selectedOutcome)
        if (outcomeIndex === -1) throw new Error('Outcome not found')

        outcomes[outcomeIndex] = {
          ...outcomes[outcomeIndex],
          totalBets: outcomes[outcomeIndex].totalBets + amount,
        }

        // Create bet document
        const betRef = doc(collection(db, 'bets'))
        transaction.set(betRef, {
          marketId: market.id,
          outcomeId: selectedOutcome,
          userId: user.id,
          userName: user.displayName,
          amount,
          createdAt: new Date(),
        })

        // Update market
        transaction.update(marketRef, {
          outcomes,
          totalPool: (marketData.totalPool || 0) + amount,
        })

        // Deduct coins from user
        transaction.update(userRef, {
          coins: currentCoins - amount,
        })
      })

      showToast(`Bet of ${amount} coins placed!`, 'success')
      setBetAmount('')
      setSelectedOutcome(null)
    } catch (error) {
      console.error('Failed to place bet:', error)
      showToast('Failed to place bet', 'error')
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

      // Calculate winnings for each bet and track the largest bet
      const payouts: { odId: string; winnings: number; amount: number }[] = []
      for (const bet of winningBets) {
        const shareOfPool = bet.amount / winningOutcome.totalBets
        const winnings = Math.floor(bet.amount + losingPool * shareOfPool)
        payouts.push({ odId: bet.userId, winnings, amount: bet.amount })
      }

      // Give rounding remainder to the largest bet winner
      const totalDistributed = payouts.reduce((sum, p) => sum + p.winnings, 0)
      const remainder = market.totalPool - totalDistributed
      if (remainder > 0 && payouts.length > 0) {
        const largestBetIndex = payouts.reduce(
          (maxIdx, p, idx, arr) => (p.amount > arr[maxIdx].amount ? idx : maxIdx),
          0
        )
        payouts[largestBetIndex].winnings += remainder
      }

      // Distribute the winnings
      for (const payout of payouts) {
        await updateDoc(doc(db, 'users', payout.odId), {
          coins: increment(payout.winnings),
        })
      }

      showToast('Market resolved! Winnings distributed.', 'success')
      navigate('/')
    } catch (error) {
      console.error('Failed to resolve market:', error)
      showToast('Failed to resolve market', 'error')
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
            {!isDeadlinePassed && (
              <span className="text-primary ml-2">({formatTimeRemaining(market.deadline)})</span>
            )}
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
                  <Button onClick={handlePlaceBet} disabled={loading}>
                    {loading ? 'Placing...' : 'Place Bet'}
                  </Button>
                </div>
                {betAmount && parseInt(betAmount) > 0 && (() => {
                  const amount = parseInt(betAmount)
                  const outcome = market.outcomes.find((o) => o.id === selectedOutcome)
                  if (!outcome) return null

                  const newOutcomeTotal = outcome.totalBets + amount
                  const losingPool = market.totalPool - outcome.totalBets
                  const payout = Math.floor(amount + losingPool * (amount / newOutcomeTotal))
                  const profit = payout - amount

                  return (
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Potential payout:</span>
                        <span className="font-medium">{payout} coins</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Potential profit:</span>
                        <span className="font-medium text-green-600">+{profit} coins</span>
                      </div>
                    </div>
                  )
                })()}
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

      {market.status === 'resolved' && bets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bet Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const winningOutcome = market.outcomes.find(
                  (o) => o.id === market.resolvedOutcomeId
                )
                if (!winningOutcome) return null

                const losingPool = market.totalPool - winningOutcome.totalBets
                const winningBets = bets.filter(
                  (b) => b.outcomeId === market.resolvedOutcomeId
                )

                // Calculate payouts with remainder going to largest bet
                const payoutMap = new Map<string, number>()
                if (winningBets.length > 0) {
                  const payouts: { odId: string; winnings: number; amount: number }[] = []
                  for (const bet of winningBets) {
                    const shareOfPool = bet.amount / winningOutcome.totalBets
                    const winnings = Math.floor(bet.amount + losingPool * shareOfPool)
                    payouts.push({ odId: bet.id, winnings, amount: bet.amount })
                  }
                  const totalDistributed = payouts.reduce((sum, p) => sum + p.winnings, 0)
                  const remainder = market.totalPool - totalDistributed
                  if (remainder > 0) {
                    const largestIdx = payouts.reduce(
                      (maxIdx, p, idx, arr) => (p.amount > arr[maxIdx].amount ? idx : maxIdx),
                      0
                    )
                    payouts[largestIdx].winnings += remainder
                  }
                  payouts.forEach((p) => payoutMap.set(p.odId, p.winnings))
                }

                return bets.map((bet) => {
                  const isWinner = bet.outcomeId === market.resolvedOutcomeId
                  const payout = payoutMap.get(bet.id) || 0
                  const profit = isWinner ? payout - bet.amount : -bet.amount

                  return (
                    <div
                      key={bet.id}
                      className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                        isWinner ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{bet.userName}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          on {market.outcomes.find((o) => o.id === bet.outcomeId)?.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Bet: {bet.amount}
                        </div>
                        <div
                          className={`font-medium ${
                            profit > 0
                              ? 'text-green-600'
                              : profit < 0
                              ? 'text-red-600'
                              : ''
                          }`}
                        >
                          {profit > 0 ? '+' : ''}
                          {profit}
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Large Bet</DialogTitle>
            <DialogDescription>
              You're about to bet <strong>{betAmount} coins</strong>, which is more than
              50% of your balance. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={placeBet} disabled={loading}>
              {loading ? 'Placing...' : 'Confirm Bet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
