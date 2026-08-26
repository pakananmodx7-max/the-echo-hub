import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AmbientBackground } from '../components/AmbientBackground'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password)
      if (!user.codename) navigate('/onboarding/codename')
      else if (!user.mood) navigate('/onboarding/mood')
      else navigate('/hub')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden px-6 py-10">
      <AmbientBackground />

      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="ย้อนกลับ"
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card text-ink-soft active:scale-95 transition"
      >
        ←
      </button>

      <div className="flex-1">
        <h1 className="text-2xl font-bold text-ink">ยินดีต้อนรับกลับมา 🤍</h1>
        <p className="mt-1 text-sm text-ink-soft">
          เข้าสู่ระบบเพื่อกลับเข้าไปในพื้นที่ของเรา
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Email / Username</span>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-2xl border border-lavender-100 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="rounded-2xl border border-lavender-100 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
          </label>

          {error ? <p className="text-sm text-pink-text">{error}</p> : null}

          <Button type="submit" fullWidth disabled={loading} className="mt-2">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>

          <button
            type="button"
            className="text-sm font-medium text-lavender-600"
            onClick={() =>
              window.alert('ฟีเจอร์นี้จะเปิดใช้งานเมื่อเชื่อมต่อระบบจริงในเวอร์ชันถัดไป')
            }
          >
            ลืมรหัสผ่าน?
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-ink-soft">
        ยังไม่มีบัญชี?{' '}
        <Link to="/register" className="font-semibold text-lavender-600">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  )
}
