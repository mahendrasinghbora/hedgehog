import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Market } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

type StatusFilter = 'all' | 'open' | 'closed' | 'resolved'

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { user } = useAuth()

  useEffect(() => {
    const q = query(collection(db, 'markets'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const marketData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Market[]
      setMarkets(marketData)
    })

    return () => unsubscribe()
  }, [])

  const getEffectiveStatus = (market: Market): Market['status'] => {
    if (market.status === 'open' && new Date() > new Date(market.deadline)) {
      return 'closed'
    }
    return market.status
  }

  const getStatusColor = (status: Market['status']) => {
    switch (status) {
      case 'open':
        return 'bg-green-500'
      case 'closed':
        return 'bg-yellow-500'
      case 'resolved':
        return 'bg-gray-500'
    }
  }

  const filteredMarkets = markets.filter((market) => {
    // Hide markets where user is tagged (unless resolved)
    const isTagged = user && market.taggedUserIds?.includes(user.id)
    if (isTagged && market.status !== 'resolved') {
      return false
    }

    const matchesSearch =
      search === '' ||
      market.title.toLowerCase().includes(search.toLowerCase()) ||
      market.description?.toLowerCase().includes(search.toLowerCase())

    const effectiveStatus = getEffectiveStatus(market)
    const matchesStatus =
      statusFilter === 'all' || effectiveStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const statusFilters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
    { label: 'Resolved', value: 'resolved' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Markets</h1>
        {user && (
          <Link to="/create">
            <Button>Create Market</Button>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {filteredMarkets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {markets.length === 0
              ? 'No markets yet. Be the first to create one!'
              : 'No markets match your filters.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMarkets.map((market) => (
            <Link key={market.id} to={`/market/${market.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">
                      {market.title}
                    </CardTitle>
                    <Badge className={getStatusColor(getEffectiveStatus(market))}>
                      {getEffectiveStatus(market)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {market.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      by {market.creatorName}
                    </span>
                    <span className="font-medium">
                      {market.totalPool} coins in pool
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
