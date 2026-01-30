import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CreateMarket() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [outcomes, setOutcomes] = useState(['Yes', 'No'])
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)

  const addOutcome = () => {
    setOutcomes([...outcomes, ''])
  }

  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes]
    newOutcomes[index] = value
    setOutcomes(newOutcomes)
  }

  const removeOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const marketOutcomes = outcomes
        .filter((o) => o.trim())
        .map((label, index) => ({
          id: `outcome-${index}`,
          label,
          totalBets: 0,
        }))

      await addDoc(collection(db, 'markets'), {
        title,
        description,
        creatorId: user.id,
        creatorName: user.displayName,
        outcomes: marketOutcomes,
        status: 'open',
        deadline: new Date(deadline),
        createdAt: new Date(),
        totalPool: 0,
      })

      navigate('/')
    } catch (error) {
      console.error('Failed to create market:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create a Market</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Will it rain tomorrow?"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Outcomes</label>
              {outcomes.map((outcome, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={outcome}
                    onChange={(e) => updateOutcome(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                  />
                  {outcomes.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeOutcome(index)}
                    >
                      X
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOutcome}>
                + Add Option
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deadline</label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Market'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
