import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Bet, Market } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Avatar, { AVATAR_STYLES } from '@/components/Avatar'
import { Pencil } from 'lucide-react'

interface BetWithMarket extends Bet {
  market?: Market
}

export default function Profile() {
  const { user, updateAvatar, updateHandle, updateDisplayName } = useAuth()
  const { showToast } = useToast()
  const [bets, setBets] = useState<BetWithMarket[]>([])
  const [stats, setStats] = useState({
    totalBets: 0,
    marketsCreated: 0,
    wins: 0,
    losses: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [handleInput, setHandleInput] = useState('')
  const [savingHandle, setSavingHandle] = useState(false)
  const [editingHandle, setEditingHandle] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [editingName, setEditingName] = useState(false)

  useEffect(() => {
    if (!user) return

    // Fetch user's bets (no orderBy to avoid index requirement)
    const betsQuery = query(
      collection(db, 'bets'),
      where('userId', '==', user.id)
    )

    const unsubscribeBets = onSnapshot(
      betsQuery,
      async (snapshot) => {
        const betData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Bet[]

        // Fetch market details for each bet
        const betsWithMarkets = await Promise.all(
          betData.map(async (bet) => {
            try {
              const marketDoc = await getDoc(doc(db, 'markets', bet.marketId))
              if (marketDoc.exists()) {
                return {
                  ...bet,
                  market: { id: marketDoc.id, ...marketDoc.data() } as Market,
                }
              }
            } catch (e) {
              console.error('Error fetching market:', e)
            }
            return bet
          })
        )

        // Sort by createdAt descending (client-side)
        betsWithMarkets.sort((a, b) => {
          const aTime = (a.createdAt as unknown as { seconds: number })?.seconds || 0
          const bTime = (b.createdAt as unknown as { seconds: number })?.seconds || 0
          return bTime - aTime
        })

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
      },
      (error) => {
        console.error('Error fetching bets:', error)
        setLoading(false)
      }
    )

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

  const handleSelectAvatar = async (avatarId: string | null) => {
    await updateAvatar(avatarId)
    setShowAvatarPicker(false)
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSavingName(true)
    try {
      await updateDisplayName(nameInput.trim())
      showToast('Name updated!', 'success')
      setNameInput('')
      setEditingName(false)
    } catch {
      showToast('Failed to update name', 'error')
    }
    setSavingName(false)
  }

  const handleSaveHandle = async () => {
    if (!handleInput.trim()) return
    setSavingHandle(true)
    const result = await updateHandle(handleInput.trim())
    if (result.success) {
      showToast('Handle saved!', 'success')
      setHandleInput('')
      setEditingHandle(false)
    } else {
      showToast(result.error || 'Failed to save handle', 'error')
    }
    setSavingHandle(false)
  }

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
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="relative group"
            >
              <Avatar seed={user.id} styleId={user.avatarId} size={64} />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs">Edit</span>
              </div>
            </button>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={user.displayName}
                    maxLength={50}
                    className="h-8 text-lg font-semibold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') { setEditingName(false); setNameInput('') }
                    }}
                  />
                  <Button size="sm" onClick={handleSaveName} disabled={savingName || !nameInput.trim()}>
                    {savingName ? '...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNameInput('') }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingName(true); setNameInput(user.displayName) }}
                  className="text-left group"
                >
                  <CardTitle className="text-xl group-hover:underline inline-flex items-center gap-1.5">
                    {user.displayName}
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                </button>
              )}
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {editingHandle ? (
                <div className="flex gap-2 items-center mt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      value={handleInput}
                      onChange={(e) => setHandleInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder={user.handle || 'your_handle'}
                      className="h-7 text-sm pl-6"
                      maxLength={20}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveHandle()
                        if (e.key === 'Escape') { setEditingHandle(false); setHandleInput('') }
                      }}
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveHandle} disabled={savingHandle || !handleInput.trim()}>
                    {savingHandle ? '...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingHandle(false); setHandleInput('') }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingHandle(true); setHandleInput(user.handle || '') }}
                  className="text-left group"
                >
                  <p className="text-sm text-primary group-hover:underline inline-flex items-center gap-1">
                    @{user.handle || 'set handle'}
                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{user.coins} coins</p>
        </CardContent>
      </Card>

      {showAvatarPicker && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choose Avatar Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleSelectAvatar(style.id)}
                  className={`p-2 rounded-lg border-2 transition-colors ${
                    user.avatarId === style.id || (!user.avatarId && style.id === 'pixelArt')
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:border-muted'
                  }`}
                >
                  <Avatar seed={user.id} styleId={style.id} size={56} className="mx-auto" />
                  <p className="text-xs text-center mt-1">{style.name}</p>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowAvatarPicker(false)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}

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
