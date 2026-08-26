import { Button } from '../../../components/Button'
import type { GardenControlMode } from './three/useGardenControls'
import type { GardenQualityMode } from './three/useGardenQuality'

interface GardenSettingsPanelProps {
  controlMode: GardenControlMode
  onControlModeChange: (mode: GardenControlMode) => void
  qualityMode: GardenQualityMode
  onQualityModeChange: (mode: GardenQualityMode) => void
  onEditAvatar: () => void
  onClose: () => void
}

const CONTROL_OPTIONS: { id: GardenControlMode; label: string }[] = [
  { id: 'tap', label: 'แตะเพื่อเดิน' },
  { id: 'joystick', label: 'Joystick' },
]

const QUALITY_OPTIONS: { id: GardenQualityMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'high', label: 'High' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'performance', label: 'Performance' },
]

export function GardenSettingsPanel({
  controlMode,
  onControlModeChange,
  qualityMode,
  onQualityModeChange,
  onEditAvatar,
  onClose,
}: GardenSettingsPanelProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-ink">⚙️ การตั้งค่าสวน</h2>

      <Button fullWidth variant="secondary" className="mt-4" onClick={onEditAvatar}>
        ✨ แต่งตัวใหม่
      </Button>

      <div className="mt-5">
        <p className="text-sm font-semibold text-ink">การควบคุม</p>
        <div className="mt-2 flex flex-col gap-2">
          {CONTROL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onControlModeChange(opt.id)}
              className={`flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${
                controlMode === opt.id
                  ? 'border-lavender-400 bg-lavender-50 font-medium text-ink'
                  : 'border-transparent bg-cream-deep/60 text-ink-soft'
              }`}
            >
              <span aria-hidden>{controlMode === opt.id ? '✅' : '○'}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-ink">คุณภาพภาพ</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onQualityModeChange(opt.id)}
              className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition ${
                qualityMode === opt.id
                  ? 'border-lavender-400 bg-lavender-50 text-lavender-600'
                  : 'border-transparent bg-cream-deep/60 text-ink-soft'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-ink-soft">
        ECHO GARDEN แสดง Codename, Avatar และ Mood ของคุณเท่านั้น ไม่แสดงชื่อจริง อีเมล
        หรือข้อมูลส่วนตัวอื่น ๆ ข้อมูลในสวนเวอร์ชันนี้เป็นข้อมูลทดลอง (Demo) และเก็บไว้ในเครื่องของคุณเท่านั้น
      </p>

      <Button fullWidth className="mt-4" onClick={onClose}>
        เข้าใจแล้ว
      </Button>
    </div>
  )
}
