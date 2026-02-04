import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from '@/types'
import Avatar from './Avatar'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
}

export default function MentionInput({
  value,
  onChange,
  placeholder,
  className = '',
  multiline = false,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => {
    const searchUsers = async () => {
      if (!mentionSearch) {
        setSuggestions([])
        return
      }

      const searchLower = mentionSearch.toLowerCase()
      const q = query(
        collection(db, 'users'),
        where('handleLower', '>=', searchLower),
        where('handleLower', '<=', searchLower + '\uf8ff'),
        limit(5)
      )

      const snapshot = await getDocs(q)
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]

      setSuggestions(users.filter((u) => u.handle))
    }

    if (showSuggestions && mentionSearch) {
      searchUsers()
    }
  }, [mentionSearch, showSuggestions])

  const handleInputChange = (newValue: string) => {
    onChange(newValue)

    const cursorPos = inputRef.current?.selectionStart || newValue.length
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1)
      // Check if there's no space after @ (still typing the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStart(atIndex)
        setMentionSearch(textAfterAt)
        setShowSuggestions(true)
        setSelectedIndex(0)
        return
      }
    }

    setShowSuggestions(false)
    setMentionSearch('')
  }

  const insertMention = (user: User) => {
    if (mentionStart === -1 || !user.handle) return

    const before = value.slice(0, mentionStart)
    const cursorPos = inputRef.current?.selectionStart || value.length
    const after = value.slice(cursorPos)

    const newValue = `${before}@${user.handle} ${after}`
    onChange(newValue)
    setShowSuggestions(false)
    setMentionSearch('')
    setMentionStart(-1)

    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = mentionStart + user.handle.length + 2
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault()
      insertMention(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const InputComponent = multiline ? 'textarea' : 'input'

  return (
    <div className="relative">
      <InputComponent
        ref={inputRef as never}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          multiline ? 'min-h-[80px] resize-none' : 'h-10'
        } ${className}`}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-accent ${
                index === selectedIndex ? 'bg-accent' : ''
              }`}
              onMouseDown={() => insertMention(user)}
            >
              <Avatar seed={user.id} styleId={user.avatarId} size={24} />
              <div>
                <span className="font-medium">@{user.handle}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {user.displayName}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper function to extract mentioned handles from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]{3,20})/g
  const matches = text.match(mentionRegex) || []
  return matches.map((m) => m.slice(1).toLowerCase())
}

// Helper function to get user IDs from handles
export async function getUserIdsFromHandles(handles: string[]): Promise<string[]> {
  if (handles.length === 0) return []

  const userIds: string[] = []
  for (const handle of handles) {
    const q = query(
      collection(db, 'users'),
      where('handleLower', '==', handle.toLowerCase()),
      limit(1)
    )
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      userIds.push(snapshot.docs[0].id)
    }
  }
  return userIds
}
