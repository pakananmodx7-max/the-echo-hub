import { Html } from '@react-three/drei'
import { getMoodById } from '../../../../data/moods'
import { mockMemberAvatarConfig } from '../../../../data/gardenAvatarOptions'
import type { GardenAvatarConfig } from '../../../../features/garden/types'
import type { MoodId } from '../../../../types'
import { GardenCharacter } from './GardenCharacter'

interface GardenAvatarProps {
  avatarId: string | null | undefined
  config?: GardenAvatarConfig
  codename?: string
  mood?: MoodId | null
  speech?: string | null
  showLabel?: boolean
  walkingRef?: { current: boolean }
}

export function GardenAvatar({
  avatarId,
  config,
  codename,
  mood,
  speech,
  showLabel = true,
  walkingRef,
}: GardenAvatarProps) {
  const resolvedConfig = config ?? mockMemberAvatarConfig(avatarId ?? 'cloud')
  const moodInfo = mood ? getMoodById(mood) : undefined

  return (
    <group>
      <GardenCharacter config={resolvedConfig} walkingRef={walkingRef} />

      {/* online dot */}
      <mesh position={[0.16, 1.34, 0.16]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#4fbf8a" emissive="#4fbf8a" emissiveIntensity={0.4} />
      </mesh>

      {showLabel && codename ? (
        <Html position={[0, 1.78, 0]} center distanceFactor={9} occlude={false}>
          <div className="pointer-events-none flex flex-col items-center gap-0.5">
            {speech ? (
              <div className="mb-1 max-w-[9rem] rounded-2xl bg-white px-2.5 py-1 text-center text-[11px] leading-snug text-ink shadow-md">
                💬 "{speech}"
              </div>
            ) : null}
            <div className="whitespace-nowrap rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-ink shadow-sm">
              {codename}
              {moodInfo ? <span className="ml-1">{moodInfo.emoji}</span> : null}
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  )
}
