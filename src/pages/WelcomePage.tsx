import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AmbientBackground } from '../components/AmbientBackground'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'

export function WelcomePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return
    if (!user?.codename) navigate('/onboarding/codename', { replace: true })
    else if (!user?.mood) navigate('/onboarding/mood', { replace: true })
    else navigate('/hub', { replace: true })
  }, [isAuthenticated, user, navigate])

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-between overflow-hidden px-6 py-10 text-center">
      <AmbientBackground />

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="text-6xl" aria-hidden>
          🤍
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-ink">THE ECHO</h1>
          <p className="mt-1 text-lg font-medium text-lavender-600">Hear with Heart 🤍</p>
        </div>
        <p className="max-w-xs text-balance text-[15px] leading-relaxed text-ink-soft">
          "พื้นที่เล็ก ๆ ที่เราได้ฟัง เข้าใจ และส่งต่อสิ่งดี ๆ ให้กัน"
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3 pb-2">
        <Button fullWidth onClick={() => navigate('/login')}>
          เข้าสู่ระบบ
        </Button>
        <Button fullWidth variant="secondary" onClick={() => navigate('/register')}>
          สมัครสมาชิก
        </Button>
      </div>
    </div>
  )
}
