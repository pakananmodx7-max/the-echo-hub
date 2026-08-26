import { Link } from 'react-router-dom'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'

export function DrawingHubPage() {
  return (
    <div>
      <PageHeader title="🎨 วาด & ฟัง" subtitle="ใช้ภาพเป็นจุดเริ่มต้นของบทสนทนา" />

      <div className="flex flex-col gap-4 px-5 pb-4">
        <Card className="bg-gradient-to-br from-lavender-50 to-white">
          <p className="text-lg font-semibold text-ink">🪞 วาดกับตัวเอง</p>
          <p className="mt-0.5 text-sm font-medium text-lavender-600">ECHO Journal</p>
          <p className="mt-1 text-sm text-ink-soft">พื้นที่ส่วนตัวสำหรับวาดและบันทึกสิ่งที่อยู่ในใจ</p>
          <Link to="/hub/draw/journal">
            <Button fullWidth variant="secondary" className="mt-4">
              เปิด ECHO Journal
            </Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-mint/40 to-white">
          <p className="text-lg font-semibold text-ink">👥 วาดกับใครสักคน</p>
          <p className="mt-0.5 text-sm font-medium text-mint-text">DRAW &amp; LISTEN</p>
          <p className="mt-1 text-sm text-ink-soft">วาด เล่า และผลัดกันฟังอย่างเข้าใจ</p>
          <Link to="/hub/draw/listen">
            <Button fullWidth variant="soft-mint" className="mt-4">
              เริ่ม DRAW &amp; LISTEN
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
