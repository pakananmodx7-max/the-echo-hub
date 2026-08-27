import { Link } from 'react-router-dom'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'

export function FriendBondPage() {
  return (
    <div>
      <PageHeader title="🫶 FRIEND BOND" subtitle="เกมเล็ก ๆ ที่ทำให้เรารู้จักกันมากขึ้น" hideBack />

      <div className="flex flex-col gap-4 px-5 pb-4">
        <Card className="bg-gradient-to-br from-mint/40 to-white">
          <p className="text-lg font-semibold text-ink">🎲 Friend Quest</p>
          <p className="mt-1 text-sm text-ink-soft">
            สุ่มภารกิจสนุก ๆ ให้ทำร่วมกับเพื่อน เพื่อทำความรู้จักกันมากขึ้น
          </p>
          <Link to="/hub/friends/quest">
            <Button fullWidth variant="soft-mint" className="mt-4">
              เริ่ม Friend Quest
            </Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-lavender-50 to-white">
          <p className="text-lg font-semibold text-ink">🎭 ทายสิ...ฉันคือใคร?</p>
          <p className="mt-1 text-sm text-ink-soft">
            เกมทายคำหลายหมวด เล่นได้ทั้งคนเดียว ผลัดกันทาย 2–12 คน หรือแข่งกันเป็นทีม
          </p>
          <Link to="/hub/friends/who-am-i">
            <Button fullWidth variant="secondary" className="mt-4">
              เริ่ม Who Am I?
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
