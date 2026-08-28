import { GardenJoystick } from './GardenJoystick'
import { GardenMusicControl } from './GardenMusicControl'
import type { GardenControlMode, GardenControls } from './three/useGardenControls'
import type { GardenTrack } from '../../../data/gardenTracks'
import type { GardenMusicStatus } from './useGardenMusic'

interface InteractionPrompt {
  icon: string
  label: string
}

interface GardenHUDProps {
  controls: GardenControls
  controlMode: GardenControlMode
  memberCount: number
  interaction: InteractionPrompt | null
  onInteract: () => void
  onOpenChat: () => void
  onOpenActivities: () => void
  onOpenOnline: () => void
  onOpenSettings: () => void
  onExit: () => void
  /** Optional, explicit "ease the camera back behind me" action — never triggered automatically (see the camera-motion-sickness fix in GardenPlayer.tsx). */
  onRecenterCamera: () => void
  music: {
    track: GardenTrack
    status: GardenMusicStatus
    isPlaying: boolean
    muted: boolean
    volume: number
    onPlay: () => void
    onPause: () => void
    onToggleMute: () => void
    onChangeVolume: (v: number) => void
  }
}

const NAV_BUTTONS: {
  key: 'onOpenChat' | 'onOpenActivities' | 'onOpenOnline' | 'onOpenSettings' | 'onExit'
  icon: string
  label: string
}[] = [
  { key: 'onOpenChat', icon: '💬', label: 'Chat' },
  { key: 'onOpenActivities', icon: '🌳', label: 'Activities' },
  { key: 'onOpenOnline', icon: '👥', label: 'Online' },
  { key: 'onOpenSettings', icon: '⚙️', label: 'Settings' },
  { key: 'onExit', icon: '🚪', label: 'ออกจากสวน' },
]

export function GardenHUD(props: GardenHUDProps) {
  const { controls, controlMode, memberCount, interaction, onInteract, onRecenterCamera, music } = props

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      <div className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),0.6rem)]">
        <span className="pointer-events-auto rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-mint-text shadow-sm backdrop-blur-md">
          🟢 มี {memberCount} คนอยู่ในสวน
        </span>
        <GardenMusicControl track={music.track} status={music.status} isPlaying={music.isPlaying} muted={music.muted} volume={music.volume} onPlay={music.onPlay} onPause={music.onPause} onToggleMute={music.onToggleMute} onChangeVolume={music.onChangeVolume} />
      </div>

      <div className="flex flex-col items-center gap-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {interaction ? (
          <button
            type="button"
            onClick={onInteract}
            className="pointer-events-auto rounded-full bg-lavender-500/95 px-5 py-3 text-sm font-semibold text-white shadow-soft backdrop-blur-md transition active:scale-95"
          >
            {interaction.icon} {interaction.label}
          </button>
        ) : null}

        <div className="flex w-full items-end justify-between px-4">
          <div className="flex items-end gap-2">
            <div className="pointer-events-auto sm:hidden">
              {controlMode === 'joystick' ? <GardenJoystick controls={controls} /> : <div className="h-[88px] w-[88px]" />}
            </div>
            <button
              type="button"
              onClick={onRecenterCamera}
              aria-label="จัดกล้องตามตัวละคร"
              title="จัดกล้องตามตัวละคร"
              className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 text-lg text-ink-soft shadow-sm backdrop-blur-md transition active:scale-95"
            >
              <span aria-hidden>◎</span>
            </button>
          </div>

          <div className="pointer-events-auto ml-auto flex gap-1 rounded-3xl bg-white/70 p-1.5 shadow-card backdrop-blur-md">
            {NAV_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={props[btn.key]}
                className="flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-ink-soft transition active:scale-95"
              >
                <span className="text-base leading-none" aria-hidden>
                  {btn.icon}
                </span>
                <span className="text-[10px] font-medium">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
