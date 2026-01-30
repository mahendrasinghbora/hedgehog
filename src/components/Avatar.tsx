import { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import * as styles from '@dicebear/collection'

// Available DiceBear styles for users to choose from
export const AVATAR_STYLES = [
  { id: 'pixelArt', name: 'Pixel Art', style: styles.pixelArt },
  { id: 'adventurer', name: 'Adventurer', style: styles.adventurer },
  { id: 'avataaars', name: 'Avataaars', style: styles.avataaars },
  { id: 'bottts', name: 'Robots', style: styles.bottts },
  { id: 'funEmoji', name: 'Fun Emoji', style: styles.funEmoji },
  { id: 'lorelei', name: 'Lorelei', style: styles.lorelei },
  { id: 'micah', name: 'Micah', style: styles.micah },
  { id: 'miniavs', name: 'Mini', style: styles.miniavs },
  { id: 'openPeeps', name: 'Open Peeps', style: styles.openPeeps },
  { id: 'personas', name: 'Personas', style: styles.personas },
  { id: 'thumbs', name: 'Thumbs', style: styles.thumbs },
  { id: 'bigSmile', name: 'Big Smile', style: styles.bigSmile },
] as const

type StyleId = typeof AVATAR_STYLES[number]['id']

interface AvatarProps {
  seed: string
  styleId?: StyleId | null
  size?: number
  className?: string
}

export default function Avatar({ seed, styleId, size = 40, className = '' }: AvatarProps) {
  const avatarDataUri = useMemo(() => {
    // Find the selected style or default to pixelArt
    const selectedStyle = AVATAR_STYLES.find((s) => s.id === styleId)?.style || styles.pixelArt

    const avatar = createAvatar(selectedStyle, {
      seed,
      size,
    })
    return avatar.toDataUri()
  }, [seed, size, styleId])

  return (
    <img
      src={avatarDataUri}
      alt="Avatar"
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
