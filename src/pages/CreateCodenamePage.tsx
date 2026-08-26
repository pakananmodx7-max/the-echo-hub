import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AmbientBackground } from '../components/AmbientBackground'
import { AVATARS } from '../data/avatars'
import { generateCodename } from '../data/codenames'
import { useAuth } from '../hooks/useAuth'

export function CreateCodenamePage() {
  const navigate = useNavigate()
  const { setCodename } = useAuth()
  const [name, setName] = useState('')
  const [avatarId, setAvatarId] = useState(AVATARS[0].id)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleRandomize() {
    setName(generateCodename())
  }

  async function handleSubmit() {
    const trimmed = name.trim()
    if (trimmed.length < 3) {
      setError('ตั้งชื่ออย่างน้อย 3 ตัวอักษรนะ')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await setCodename(trimmed, avatarId)
      navigate('/onboarding/mood')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden px-6 py-10">
      <AmbientBackground />

      <div className="flex-1">
        <h1 className="text-2xl font-bold text-ink">
          ในพื้นที่นี้ อยากให้เราเรียกคุณว่าอะไร?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          คุณไม่จำเป็นต้องใช้ชื่อจริง คนอื่นจะเห็นคุณผ่าน Code Name นี้
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-full text-5xl shadow-card ${
              AVATARS.find((a) => a.id === avatarId)?.bg ?? 'bg-lavender-100'
            }`}
          >
            <span aria-hidden>{AVATARS.find((a) => a.id === avatarId)?.emoji}</span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setAvatarId(avatar.id)}
                aria-pressed={avatarId === avatar.id}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition ${avatar.bg} ${
                  avatarId === avatar.id
                    ? 'ring-2 ring-lavender-500 scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span aria-hidden>{avatar.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Code Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น BlueMoon17"
              className="rounded-2xl border border-lavender-100 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
          </label>
          {error ? <p className="mt-2 text-sm text-pink-text">{error}</p> : null}

          <button
            type="button"
            onClick={handleRandomize}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-lavender-600"
          >
            สุ่มชื่อให้ฉัน <span aria-hidden>🎲</span>
          </button>
        </div>
      </div>

      <Button fullWidth onClick={handleSubmit} disabled={submitting}>
        ใช้ชื่อนี้ →
      </Button>
    </div>
  )
}
