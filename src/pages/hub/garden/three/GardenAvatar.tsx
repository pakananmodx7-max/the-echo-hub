import { Html } from '@react-three/drei'
import { getMoodById } from '../../../../data/moods'
import type { MoodId } from '../../../../types'
import { avatarBodyColor } from './gardenColors'

interface GardenAvatarProps {
  avatarId: string | null | undefined
  codename?: string
  mood?: MoodId | null
  speech?: string | null
  showLabel?: boolean
}

export function GardenAvatar({ avatarId, codename, mood, speech, showLabel = true }: GardenAvatarProps) {
  const color = avatarBodyColor(avatarId)
  const moodInfo = mood ? getMoodById(mood) : undefined

  return (
    <group>
      {/* body */}
      <mesh position={[0, 0.55, 0]} castShadow={false} receiveShadow={false}>
        <capsuleGeometry args={[0.28, 0.5, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.15, 0]} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#fff7ec" roughness={0.7} />
      </mesh>
      {/* online dot */}
      <mesh position={[0.2, 1.28, 0.18]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#4fbf8a" emissive="#4fbf8a" emissiveIntensity={0.4} />
      </mesh>

      {showLabel && codename ? (
        <Html position={[0, 1.75, 0]} center distanceFactor={9} occlude={false}>
          <div className="pointer-events-none flex flex-col items-center gap-0.5">
            {speech ? (
              <div className="mb-1 max-w-[9rem] rounded-2xl bg-white px-2.5 py-1 text-center text-[11px] leading-snug text-ink shadow-md">
                💬 "{speech}"
              </div>
            ) : null}
            <div className="whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink shadow">
              {codename}
              {moodInfo ? <span className="ml-1">{moodInfo.emoji}</span> : null}
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  )
}
