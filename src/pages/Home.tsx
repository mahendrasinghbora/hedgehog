import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Market } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([])
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

      {markets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No markets yet. Be the first to create one!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {markets.map((market) => (
            <Link key={market.id} to={`/market/${market.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">
                      {market.title}
                    </CardTitle>
                    <Badge className={getStatusColor(market.status)}>
                      {market.status}
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
