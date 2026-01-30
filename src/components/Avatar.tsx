import { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import { pixelArt } from '@dicebear/collection'

// Pixel animal avatars (emoji-based for simplicity)
export const ANIMAL_AVATARS = [
  { id: 'hedgehog', emoji: '🦔', name: 'Hedgehog' },
  { id: 'fox', emoji: '🦊', name: 'Fox' },
  { id: 'cat', emoji: '🐱', name: 'Cat' },
  { id: 'dog', emoji: '🐶', name: 'Dog' },
  { id: 'owl', emoji: '🦉', name: 'Owl' },
  { id: 'bear', emoji: '🐻', name: 'Bear' },
  { id: 'rabbit', emoji: '🐰', name: 'Rabbit' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'koala', emoji: '🐨', name: 'Koala' },
  { id: 'tiger', emoji: '🐯', name: 'Tiger' },
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'wolf', emoji: '🐺', name: 'Wolf' },
]

interface AvatarProps {
  seed: string
  avatarId?: string | null
  size?: number
  className?: string
}

export default function Avatar({ seed, avatarId, size = 40, className = '' }: AvatarProps) {
  // Check if using an animal avatar
  const animalAvatar = ANIMAL_AVATARS.find((a) => a.id === avatarId)

  // Generate pixel art avatar from DiceBear as fallback
  const pixelAvatar = useMemo(() => {
    if (animalAvatar) return null
    const avatar = createAvatar(pixelArt, {
      seed,
      size,
    })
    return avatar.toDataUri()
  }, [seed, size, animalAvatar])

  if (animalAvatar) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-muted ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.6 }}
      >
        {animalAvatar.emoji}
      </div>
    )
  }

  return (
    <img
      src={pixelAvatar!}
      alt="Avatar"
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
