import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User as FirebaseUser,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'

const STARTING_COINS = 1000

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateCoins: (newAmount: number) => Promise<void>
  updateAvatar: (avatarId: string | null) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUser({
            ...data,
            id: fbUser.uid,
            coins: typeof data.coins === 'number' ? data.coins : STARTING_COINS,
          } as User)
        } else {
          // Create new user with starting coins
          const newUser: User = {
            id: fbUser.uid,
            displayName: fbUser.displayName || 'Anonymous',
            email: fbUser.email || '',
            coins: STARTING_COINS,
            createdAt: new Date(),
          }
          await setDoc(doc(db, 'users', fbUser.uid), newUser)
          setUser(newUser)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  const updateCoins = async (newAmount: number) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.id), { coins: newAmount })
    setUser({ ...user, coins: newAmount })
  }

  const updateAvatar = async (avatarId: string | null) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.id), { avatarId })
    setUser({ ...user, avatarId: avatarId || undefined })
  }

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signInWithGoogle, signOut, updateCoins, updateAvatar }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
