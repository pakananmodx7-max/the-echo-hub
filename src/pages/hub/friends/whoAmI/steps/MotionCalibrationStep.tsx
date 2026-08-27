import { useEffect, useState } from 'react'
import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'
import { useMotionGestures } from '../../../../../features/friendBond/whoAmI/useMotionGestures'

interface MotionCalibrationStepProps {
  /** controlMode: 'motion' when the player confirms the sensor test, 'buttons' when they skip/opt out/fail. */
  onDone: (controlMode: 'motion' | 'buttons') => void
}

export function MotionCalibrationStep({ onDone }: MotionCalibrationStepProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const [sawUp, setSawUp] = useState(false)
  const [sawDown, setSawDown] = useState(false)

  const { support, requestPermission, recalibrate } = useMotionGestures({
    active: true,
    onTiltUp: () => {
      setSawUp(true)
      flashOnce('up')
    },
    onTiltDown: () => {
      setSawDown(true)
      flashOnce('down')
    },
  })

  // Recalibrate baseline once we actually reach the testing UI, so "neutral" matches
  // however the player is holding the phone right now (e.g. at the forehead).
  useEffect(() => {
    if (support === 'ready') recalibrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [support])

  function flashOnce(dir: 'up' | 'down') {
    setFlash(dir)
    if ('vibrate' in navigator) navigator.vibrate?.(30)
    setTimeout(() => setFlash(null), 500)
  }

  if (support === 'checking') {
    return (
      <div className="flex flex-col gap-4 px-5 pb-4">
        <Card className="text-center text-sm text-ink-soft">กำลังตรวจสอบเซนเซอร์...</Card>
      </div>
    )
  }

  if (support === 'needs-permission') {
    return (
      <div className="flex flex-col gap-4 px-5 pb-4">
        <Card className="text-center">
          <p className="text-3xl" aria-hidden>
            📱
          </p>
          <p className="mt-2 font-semibold text-ink">เล่นด้วยการเอียงมือถือ</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            ถือโทรศัพท์ไว้ที่หน้าผาก แล้วเอียงขึ้น-ลงแทนการกดปุ่ม ต้องขอสิทธิ์ใช้เซนเซอร์การเคลื่อนไหวก่อน
          </p>
        </Card>
        <Button fullWidth onClick={() => void requestPermission()}>
          ขอสิทธิ์ใช้เซนเซอร์
        </Button>
        <Button fullWidth variant="ghost" onClick={() => onDone('buttons')}>
          ข้าม ใช้ปุ่มแทน
        </Button>
      </div>
    )
  }

  if (support === 'unsupported' || support === 'denied') {
    return (
      <div className="flex flex-col gap-4 px-5 pb-4">
        <Card className="text-center">
          <p className="text-3xl" aria-hidden>
            🔘
          </p>
          <p className="mt-2 font-semibold text-ink">
            {support === 'denied' ? 'ไม่ได้รับสิทธิ์ใช้เซนเซอร์' : 'อุปกรณ์นี้ไม่รองรับการเอียงควบคุม'}
          </p>
          <p className="mt-1 text-sm text-ink-soft">ใช้ปุ่ม ✅ ถูก! / ↷ ข้าม แทนได้ตามปกติ</p>
        </Card>
        <Button fullWidth onClick={() => onDone('buttons')}>
          ต่อไป
        </Button>
      </div>
    )
  }

  const ready = sawUp && sawDown

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-3xl" aria-hidden>
          📱
        </p>
        <p className="mt-2 font-semibold text-ink">ลองเอียงมือถือ</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          ถือโทรศัพท์ไว้ที่หน้าผาก แล้วลองเอียงหน้าจอขึ้นและลงดู
        </p>
      </Card>

      <Card
        className={`flex min-h-40 flex-col items-center justify-center gap-2 text-center transition-colors ${
          flash === 'up' ? 'bg-mint' : flash === 'down' ? 'bg-pink-glow' : 'bg-cream-deep'
        }`}
      >
        {flash === 'up' ? (
          <p className="text-3xl font-extrabold text-mint-text">ถูก ✓</p>
        ) : flash === 'down' ? (
          <p className="text-3xl font-extrabold text-pink-text">ข้าม ↷</p>
        ) : (
          <p className="text-sm text-ink-faint">รอการเอียง...</p>
        )}
      </Card>

      <div className="flex gap-3 text-center text-sm">
        <div className={`flex-1 rounded-2xl py-2.5 font-semibold ${sawUp ? 'bg-mint/60 text-mint-text' : 'bg-cream-deep text-ink-faint'}`}>
          {sawUp ? '✓' : '○'} หงายขึ้น = ถูก
        </div>
        <div className={`flex-1 rounded-2xl py-2.5 font-semibold ${sawDown ? 'bg-pink-glow/60 text-pink-text' : 'bg-cream-deep text-ink-faint'}`}>
          {sawDown ? '✓' : '○'} คว่ำลง = ข้าม
        </div>
      </div>

      <Button fullWidth disabled={!ready} onClick={() => onDone('motion')}>
        พร้อม เล่นเลย! 🎭
      </Button>
      <Button fullWidth variant="ghost" onClick={() => onDone('buttons')}>
        ข้าม ใช้ปุ่มแทน
      </Button>
    </div>
  )
}
