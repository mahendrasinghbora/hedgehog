import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function GetStarted() {
  const { user } = useAuth()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to HedgeHog</h1>
        <p className="text-muted-foreground">
          A prediction market game for friends. Bet virtual coins on outcomes!
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Get Your Coins</h3>
            <p className="text-sm text-muted-foreground">
              Every new user starts with <strong>1,000 virtual coins</strong>.
              These aren't real money - just for fun with friends!
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">2. Browse or Create Markets</h3>
            <p className="text-sm text-muted-foreground">
              A <strong>market</strong> is a question about a future event.
              For example: "Will it rain tomorrow?" or "Who will win the game?"
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">3. Place Your Bets</h3>
            <p className="text-sm text-muted-foreground">
              Choose an <strong>outcome</strong> you think will happen and bet
              your coins on it. The more confident you are, the more you can bet!
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">4. Wait for Resolution</h3>
            <p className="text-sm text-muted-foreground">
              Once the event happens, the market creator <strong>resolves</strong>
              the market by selecting the winning outcome.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">5. Collect Winnings</h3>
            <p className="text-sm text-muted-foreground">
              Winners split the <strong>pool</strong> proportionally based on
              how much they bet. Bet early on unpopular outcomes for bigger payouts!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Market: "Will Team A win?" with 1,000 coins total in the pool.
          </p>
          <div className="bg-muted p-3 rounded-lg space-y-1">
            <p><strong>Yes:</strong> 300 coins (30%)</p>
            <p><strong>No:</strong> 700 coins (70%)</p>
          </div>
          <p className="text-muted-foreground">
            If <strong>Yes</strong> wins, those who bet Yes split the entire
            1,000 coin pool. If you bet 100 coins on Yes (1/3 of Yes bets),
            you'd win ~333 coins total!
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Glossary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold">Market</dt>
              <dd className="text-muted-foreground">
                A question or prediction about a future event.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Outcome</dt>
              <dd className="text-muted-foreground">
                A possible answer to the market question (e.g., Yes/No).
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Pool</dt>
              <dd className="text-muted-foreground">
                The total coins bet on a market by all users.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Deadline</dt>
              <dd className="text-muted-foreground">
                The cutoff time after which no more bets are accepted.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Resolution</dt>
              <dd className="text-muted-foreground">
                When the market creator declares the winning outcome and
                payouts are distributed.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Bet on outcomes you think are undervalued by others</li>
            <li>Don't bet all your coins on one market - diversify!</li>
            <li>Create fun markets for your friend group</li>
            <li>Check deadlines before placing bets</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-4">
        {user ? (
          <Link to="/">
            <Button size="lg">Start Betting</Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button size="lg">Sign In to Play</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
