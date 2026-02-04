import { useState } from 'react'
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Market, Bet } from '@/types'

const STARTING_COINS = 1000

interface UserCorrection {
  userId: string
  displayName: string
  currentCoins: number
  correctCoins: number
  difference: number
  totalBets: number
  totalWinnings: number
}

export default function Admin() {
  const { user } = useAuth()
  const [corrections, setCorrections] = useState<UserCorrection[]>([])
  const [loading, setLoading] = useState(false)
  const [calculated, setCalculated] = useState(false)
  const [applied, setApplied] = useState(false)

  const calculateCorrections = async () => {
    setLoading(true)
    setApplied(false)
    try {
      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const users = new Map<string, { displayName: string; coins: number }>()
      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        users.set(doc.id, {
          displayName: data.displayName || 'Unknown',
          coins: data.coins || 0,
        })
      })

      // Fetch all bets
      const betsSnapshot = await getDocs(collection(db, 'bets'))
      const bets: Bet[] = betsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bet[]

      // Fetch all resolved markets
      const marketsQuery = query(
        collection(db, 'markets'),
        where('status', '==', 'resolved')
      )
      const marketsSnapshot = await getDocs(marketsQuery)
      const resolvedMarkets: Market[] = marketsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Market[]

      // Calculate correct balances for each user
      const userBalances = new Map<
        string,
        { totalBets: number; totalWinnings: number }
      >()

      // Initialize all users
      users.forEach((_, odId) => {
        userBalances.set(odId, { totalBets: 0, totalWinnings: 0 })
      })

      // Sum up all bets placed by each user
      for (const bet of bets) {
        const balance = userBalances.get(bet.userId) || {
          totalBets: 0,
          totalWinnings: 0,
        }
        balance.totalBets += bet.amount
        userBalances.set(bet.userId, balance)
      }

      // Calculate winnings from resolved markets
      for (const market of resolvedMarkets) {
        if (!market.resolvedOutcomeId) continue

        const winningOutcome = market.outcomes.find(
          (o) => o.id === market.resolvedOutcomeId
        )
        if (!winningOutcome || winningOutcome.totalBets === 0) continue

        const losingPool = market.totalPool - winningOutcome.totalBets
        const marketBets = bets.filter((b) => b.marketId === market.id)
        const winningBets = marketBets.filter(
          (b) => b.outcomeId === market.resolvedOutcomeId
        )

        for (const bet of winningBets) {
          const shareOfPool = bet.amount / winningOutcome.totalBets
          const winnings = Math.floor(bet.amount + losingPool * shareOfPool)

          const balance = userBalances.get(bet.userId) || {
            totalBets: 0,
            totalWinnings: 0,
          }
          balance.totalWinnings += winnings
          userBalances.set(bet.userId, balance)
        }
      }

      // Build corrections list
      const correctionsList: UserCorrection[] = []
      users.forEach((userData, odId) => {
        const balance = userBalances.get(odId) || {
          totalBets: 0,
          totalWinnings: 0,
        }
        const correctCoins =
          STARTING_COINS - balance.totalBets + balance.totalWinnings
        const difference = correctCoins - userData.coins

        correctionsList.push({
          userId: odId,
          displayName: userData.displayName,
          currentCoins: userData.coins,
          correctCoins,
          difference,
          totalBets: balance.totalBets,
          totalWinnings: balance.totalWinnings,
        })
      })

      // Sort by difference (most affected first)
      correctionsList.sort(
        (a, b) => Math.abs(b.difference) - Math.abs(a.difference)
      )

      setCorrections(correctionsList)
      setCalculated(true)
    } catch (error) {
      console.error('Failed to calculate corrections:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyCorrections = async () => {
    setLoading(true)
    try {
      for (const correction of corrections) {
        if (correction.difference !== 0) {
          await updateDoc(doc(db, 'users', correction.userId), {
            coins: correction.correctCoins,
          })
        }
      }
      setApplied(true)
    } catch (error) {
      console.error('Failed to apply corrections:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-8">Please sign in to access admin tools.</div>
    )
  }

  if (!user.isAdmin) {
    return (
      <div className="text-center py-8">You do not have permission to access this page.</div>
    )
  }

  const needsCorrection = corrections.filter((c) => c.difference !== 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coin Balance Repair Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This tool recalculates correct coin balances for all users based on
            their betting history and winnings from resolved markets.
          </p>
          <Button onClick={calculateCorrections} disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate Corrections'}
          </Button>
        </CardContent>
      </Card>

      {calculated && (
        <Card>
          <CardHeader>
            <CardTitle>
              Results: {needsCorrection.length} users need correction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {corrections.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <>
                <div className="max-h-96 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4">User</th>
                        <th className="text-right py-2 px-3">Current</th>
                        <th className="text-right py-2 px-3">Correct</th>
                        <th className="text-right py-2 px-3">Diff</th>
                        <th className="text-right py-2 px-3">Bets</th>
                        <th className="text-right py-2 pl-3">Winnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corrections.map((c) => (
                        <tr
                          key={c.userId}
                          className={`border-b ${
                            c.difference !== 0 ? 'bg-yellow-500/10' : ''
                          }`}
                        >
                          <td className="py-2 pr-4">{c.displayName}</td>
                          <td className="text-right px-3">{c.currentCoins}</td>
                          <td className="text-right px-3">{c.correctCoins}</td>
                          <td
                            className={`text-right px-3 font-medium ${
                              c.difference > 0
                                ? 'text-green-600'
                                : c.difference < 0
                                ? 'text-red-600'
                                : ''
                            }`}
                          >
                            {c.difference > 0 ? '+' : ''}
                            {c.difference}
                          </td>
                          <td className="text-right px-3">{c.totalBets}</td>
                          <td className="text-right pl-3">{c.totalWinnings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {needsCorrection.length > 0 && !applied && (
                  <Button
                    onClick={applyCorrections}
                    disabled={loading}
                    variant="default"
                  >
                    {loading
                      ? 'Applying...'
                      : `Apply ${needsCorrection.length} Corrections`}
                  </Button>
                )}

                {applied && (
                  <p className="text-green-600 font-medium">
                    All corrections have been applied successfully.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
