import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import Avatar from '@/components/Avatar'

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()

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
                <div
                  key={user.id}
                  className={`flex items-center justify-between py-3 px-2 rounded-lg ${
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
                    <Avatar seed={user.id} avatarId={user.avatarId} size={32} />
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
