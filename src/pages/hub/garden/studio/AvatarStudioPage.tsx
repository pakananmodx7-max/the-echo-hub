import { Suspense, lazy, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../../../components/PageHeader'
import { Card } from '../../../../components/Card'
import { Button } from '../../../../components/Button'
import { Avatar } from '../../../../components/Avatar'
import { useAuth } from '../../../../hooks/useAuth'
import { avatarProfileService } from '../../../../features/garden/avatarProfileService'
import { primeGardenMusicPlayer } from '../useGardenMusic'
import {
  ACCESSORIES,
  BOTTOM_STYLES,
  CLOTHING_COLORS,
  DEFAULT_GARDEN_AVATAR_CONFIG,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  TOP_STYLES,
} from '../../../../data/gardenAvatarOptions'
import type { GardenAvatarConfig } from '../../../../features/garden/types'

const AvatarPreviewCanvas = lazy(() =>
  import('./AvatarPreviewCanvas').then((m) => ({ default: m.AvatarPreviewCanvas })),
)

function ColorSwatchRow({
  colors,
  selected,
  onSelect,
}: {
  colors: string[]
  selected: string
  onSelect: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onSelect(c)}
          aria-label={`สี ${c}`}
          className={`h-8 w-8 rounded-full border-2 transition ${
            selected === c ? 'scale-110 border-lavender-500' : 'border-white'
          }`}
          style={{ backgroundColor: c, boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
        />
      ))}
    </div>
  )
}

function OptionChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { id: T; label: string }[]
  selected: T
  onSelect: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition ${
            selected === opt.id
              ? 'border-lavender-400 bg-lavender-50 text-lavender-600'
              : 'border-transparent bg-cream-deep/60 text-ink-soft'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function AvatarStudioPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [config, setConfig] = useState<GardenAvatarConfig>(() => {
    if (!user) return DEFAULT_GARDEN_AVATAR_CONFIG
    return avatarProfileService.getConfig(user.id) ?? DEFAULT_GARDEN_AVATAR_CONFIG
  })

  if (!user) return null

  function patch(partial: Partial<GardenAvatarConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }))
  }

  function handleEnter() {
    primeGardenMusicPlayer()
    avatarProfileService.saveConfig(user!.id, config)
    navigate('/hub/garden')
  }

  return (
    <div className="min-h-svh bg-cream pb-8">
      <PageHeader title="🌿 เตรียมตัวเข้าสวน" subtitle="สร้างตัวตนเล็ก ๆ ของคุณใน ECHO GARDEN" />

      <div className="flex flex-col gap-4 px-5">
        <Suspense
          fallback={
            <div className="flex h-64 w-full items-center justify-center rounded-3xl bg-lavender-50 text-sm text-ink-soft">
              กำลังโหลดตัวอย่าง...
            </div>
          }
        >
          <AvatarPreviewCanvas config={config} />
        </Suspense>
        <p className="text-center text-xs text-ink-faint">ลากเพื่อหมุน • บีบสองนิ้วหรือเลื่อนเพื่อซูม</p>

        <Card className="flex items-center gap-3">
          <Avatar avatarId={user.avatarId} size="sm" />
          <div className="min-w-0">
            <p className="text-xs text-ink-faint">Codename ของคุณ</p>
            <p className="truncate font-semibold text-ink">{user.codename}</p>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-ink">โทนผิว</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => patch({ skinTone: tone.id })}
                aria-label={tone.label}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  config.skinTone === tone.id ? 'scale-110 border-lavender-500' : 'border-white'
                }`}
                style={{ backgroundColor: tone.hex, boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
              />
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-ink">ทรงผม</p>
          <div className="mt-3">
            <OptionChipRow options={HAIR_STYLES} selected={config.hairStyle} onSelect={(id) => patch({ hairStyle: id })} />
          </div>
          <p className="mt-3 text-xs font-medium text-ink-faint">สีผม</p>
          <div className="mt-2">
            <ColorSwatchRow colors={HAIR_COLORS} selected={config.hairColor} onSelect={(c) => patch({ hairColor: c })} />
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-ink">เสื้อ</p>
          <div className="mt-3">
            <OptionChipRow options={TOP_STYLES} selected={config.topStyle} onSelect={(id) => patch({ topStyle: id })} />
          </div>
          <p className="mt-3 text-xs font-medium text-ink-faint">สีเสื้อ</p>
          <div className="mt-2">
            <ColorSwatchRow colors={CLOTHING_COLORS} selected={config.topColor} onSelect={(c) => patch({ topColor: c })} />
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-ink">กางเกง/กระโปรง</p>
          <div className="mt-3">
            <OptionChipRow
              options={BOTTOM_STYLES}
              selected={config.bottomStyle}
              onSelect={(id) => patch({ bottomStyle: id })}
            />
          </div>
          <p className="mt-3 text-xs font-medium text-ink-faint">สี</p>
          <div className="mt-2">
            <ColorSwatchRow colors={CLOTHING_COLORS} selected={config.bottomColor} onSelect={(c) => patch({ bottomColor: c })} />
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-ink">เครื่องประดับ (ไม่บังคับ)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACCESSORIES.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => patch({ accessory: acc.id })}
                className={`flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition ${
                  config.accessory === acc.id
                    ? 'border-lavender-400 bg-lavender-50 text-lavender-600'
                    : 'border-transparent bg-cream-deep/60 text-ink-soft'
                }`}
              >
                <span aria-hidden>{acc.icon}</span> {acc.label}
              </button>
            ))}
          </div>
        </Card>

        <Button fullWidth onClick={handleEnter} className="mt-2">
          🌿 พร้อมแล้ว — เข้าสวน
        </Button>
      </div>
    </div>
  )
}
