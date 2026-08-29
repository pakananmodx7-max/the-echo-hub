import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AnimatedEchoBackground } from '../components/AnimatedEchoBackground'
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
      <AnimatedEchoBackground />

      <div className="ewbg-content-in relative z-10 flex flex-1 flex-col items-center justify-center gap-6">
        <div className="text-6xl" aria-hidden>
          🏫
        </div>
        <div>
          <p className="text-sm font-medium tracking-wide text-ink-soft">โรงเรียนสักงามวิทยา</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-ink">THE ECHO</h1>
          <p className="mt-1 text-lg font-semibold">
            <span className="bg-gradient-to-r from-lavender-600 to-lavender-400 bg-clip-text text-transparent">
              Hear with Heart
            </span>{' '}
            <span className="ewbg-heart-pulse" aria-hidden>
              🤍
            </span>
          </p>
        </div>
        <p className="max-w-xs text-balance text-[15px] leading-relaxed text-ink-soft">
          "พื้นที่เล็ก ๆ ที่เราได้ฟัง เข้าใจ และส่งต่อสิ่งดี ๆ ให้กัน"
        </p>
      </div>

      <div className="ewbg-content-in relative z-10 flex w-full max-w-xs flex-col gap-3 pb-2">
        <Button
          fullWidth
          onClick={() => navigate('/login')}
          className="bg-gradient-to-r from-lavender-400 to-lavender-600 transition-all duration-200 hover:-translate-y-px hover:shadow-lg"
        >
          เข้าสู่ระบบ
        </Button>
        <Button
          fullWidth
          variant="secondary"
          onClick={() => navigate('/register')}
          className="transition-transform duration-200 hover:-translate-y-px"
        >
          สมัครสมาชิก
        </Button>
      </div>
    </div>
  )
}
