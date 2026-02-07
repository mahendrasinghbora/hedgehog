import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  if (user) {
    return <Navigate to="/" />
  }

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
      navigate('/')
    } catch (error) {
      console.error('Failed to sign in:', error)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to HedgeHog</CardTitle>
          <CardDescription>
            Prediction markets for friends. Bet virtual coins on outcomes!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSignIn} className="w-full" size="lg">
            Sign in with Google
          </Button>
          <div className="text-center">
            <Link
              to="/get-started"
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              New here? Learn how to play
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
