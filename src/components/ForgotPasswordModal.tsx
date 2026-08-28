import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { authService } from '../features/auth/authService'

interface ForgotPasswordModalProps {
  open: boolean
  onClose: () => void
}

/**
 * The real password-reset flow (sendPasswordResetEmail via authService.resetPassword) —
 * replaces the old "coming soon" alert entirely. Resets its own local state whenever it's
 * reopened, so a previous send's success/error never bleeds into the next attempt.
 */
export function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function handleClose() {
    if (loading) return
    onClose()
    // Deferred so the modal's closing animation doesn't visibly flash back to the form.
    setTimeout(() => {
      setEmail('')
      setError(null)
      setSent(false)
    }, 200)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return
    setError(null)
    setLoading(true)
    try {
      await authService.resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ส่งลิงก์รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {sent ? (
        <div className="text-center">
          <p className="text-3xl" aria-hidden>
            💌
          </p>
          <p className="mt-3 whitespace-pre-line font-semibold text-ink">{'ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว 💜\nกรุณาตรวจสอบอีเมลของคุณ'}</p>
          <Button fullWidth className="mt-5" onClick={handleClose}>
            ปิด
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-bold text-ink">ลืมรหัสผ่าน?</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            กรอกอีเมลที่ใช้สมัคร แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
          </p>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">อีเมล</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-2xl border border-lavender-100 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
          </label>

          {error ? <p className="mt-3 text-sm text-pink-text">{error}</p> : null}

          <div className="mt-5 flex flex-col gap-2.5">
            <Button type="submit" fullWidth disabled={loading || !email.trim()}>
              {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
            </Button>
            <Button type="button" variant="ghost" fullWidth disabled={loading} onClick={handleClose}>
              ยกเลิก
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
