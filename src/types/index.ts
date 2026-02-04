export interface User {
  id: string
  displayName: string
  email: string
  coins: number
  avatarId?: string
  handle?: string
  isAdmin?: boolean
  createdAt: Date
}

export interface Market {
  id: string
  title: string
  description: string
  creatorId: string
  creatorName: string
  outcomes: Outcome[]
  status: 'open' | 'closed' | 'resolved'
  resolvedOutcomeId?: string
  taggedUserIds?: string[]
  deadline: Date
  createdAt: Date
  totalPool: number
}

export interface Outcome {
  id: string
  label: string
  totalBets: number
}

export interface Bet {
  id: string
  marketId: string
  outcomeId: string
  userId: string
  userName: string
  amount: number
  createdAt: Date
}
