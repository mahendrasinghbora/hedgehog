import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User as FirebaseUser,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'

const STARTING_COINS = 1000

async function generateUniqueHandle(displayName: string): Promise<{ handle: string; handleLower: string }> {
  // Convert display name to handle format
  let baseHandle = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Remove consecutive underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .slice(0, 15) // Leave room for numbers

  // Ensure minimum length
  if (baseHandle.length < 3) {
    baseHandle = 'user_' + baseHandle
  }

  // Check if handle is taken, append random number if needed
  let handle = baseHandle
  let handleLower = handle.toLowerCase()
  let attempts = 0

  while (attempts < 10) {
    const q = query(collection(db, 'users'), where('handleLower', '==', handleLower))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { handle, handleLower }
    }

    // Handle taken, append random number
    const randomNum = Math.floor(Math.random() * 9000) + 1000
    handle = `${baseHandle}${randomNum}`
    handleLower = handle.toLowerCase()
    attempts++
  }

  // Fallback: use timestamp
  handle = `${baseHandle}${Date.now()}`
  handleLower = handle.toLowerCase()
  return { handle, handleLower }
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateCoins: (newAmount: number) => Promise<void>
  updateAvatar: (avatarId: string | null) => Promise<void>
  updateHandle: (handle: string) => Promise<{ success: boolean; error?: string }>
  updateDisplayName: (displayName: string) => Promise<void>
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

          // Auto-generate handle for existing users without one
          if (!data.handle) {
            const displayName = data.displayName || fbUser.displayName || 'Anonymous'
            const { handle, handleLower } = await generateUniqueHandle(displayName)
            await updateDoc(doc(db, 'users', fbUser.uid), { handle, handleLower })
            data.handle = handle
          }

          setUser({
            ...data,
            id: fbUser.uid,
            coins: typeof data.coins === 'number' ? data.coins : STARTING_COINS,
          } as User)
        } else {
          // Create new user with starting coins and auto-generated handle
          const displayName = fbUser.displayName || 'Anonymous'
          const { handle, handleLower } = await generateUniqueHandle(displayName)

          const newUser: User = {
            id: fbUser.uid,
            displayName,
            email: fbUser.email || '',
            coins: STARTING_COINS,
            handle,
            createdAt: new Date(),
          }
          await setDoc(doc(db, 'users', fbUser.uid), { ...newUser, handleLower })
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

  const updateHandle = async (handle: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in' }

    // Validate handle format (alphanumeric and underscores only, 3-20 chars)
    const handleRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!handleRegex.test(handle)) {
      return { success: false, error: 'Handle must be 3-20 characters, alphanumeric and underscores only' }
    }

    // Check if handle is already taken (case insensitive)
    const handleLower = handle.toLowerCase()
    const q = query(collection(db, 'users'), where('handleLower', '==', handleLower))
    const snapshot = await getDocs(q)

    if (!snapshot.empty && snapshot.docs[0].id !== user.id) {
      return { success: false, error: 'Handle is already taken' }
    }

    await updateDoc(doc(db, 'users', user.id), { handle, handleLower })
    setUser({ ...user, handle })
    return { success: true }
  }

  const updateDisplayName = async (displayName: string) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.id), { displayName })
    setUser({ ...user, displayName })
  }

  if (loading) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signInWithGoogle, signOut, updateCoins, updateAvatar, updateHandle, updateDisplayName }}
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
