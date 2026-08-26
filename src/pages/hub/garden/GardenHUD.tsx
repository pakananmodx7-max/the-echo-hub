import { GardenJoystick } from './GardenJoystick'
import type { GardenControls } from './three/useGardenControls'

interface InteractionPrompt {
  icon: string
  label: string
}

interface GardenHUDProps {
  controls: GardenControls
  memberCount: number
  interaction: InteractionPrompt | null
  onInteract: () => void
  onOpenChat: () => void
  onOpenActivities: () => void
  onOpenOnline: () => void
  onOpenSettings: () => void
  onExit: () => void
}

const NAV_BUTTONS: { key: keyof Omit<GardenHUDProps, 'controls' | 'memberCount' | 'interaction' | 'onInteract'>; icon: string; label: string }[] = [
  { key: 'onOpenChat', icon: '💬', label: 'Chat' },
  { key: 'onOpenActivities', icon: '🌳', label: 'Activities' },
  { key: 'onOpenOnline', icon: '👥', label: 'Online' },
  { key: 'onOpenSettings', icon: '⚙️', label: 'Settings' },
  { key: 'onExit', icon: '🚪', label: 'ออกจากสวน' },
]

export function GardenHUD(props: GardenHUDProps) {
  const { controls, memberCount, interaction, onInteract } = props

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      <div className="flex justify-center pt-[max(env(safe-area-inset-top),0.75rem)]">
        <span className="pointer-events-auto rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-mint-text shadow">
          🟢 มี {memberCount} คนอยู่ในสวน
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {interaction ? (
          <button
            type="button"
            onClick={onInteract}
            className="pointer-events-auto rounded-full bg-lavender-500 px-5 py-3 text-sm font-semibold text-white shadow-soft active:scale-95"
          >
            {interaction.icon} {interaction.label}
          </button>
        ) : null}

        <div className="flex w-full items-end justify-between px-4">
          <div className="pointer-events-auto sm:hidden">
            <GardenJoystick controls={controls} />
          </div>

          <div className="pointer-events-auto ml-auto flex gap-1.5 rounded-3xl bg-white/90 p-1.5 shadow-card">
            {NAV_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={props[btn.key] as () => void}
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
