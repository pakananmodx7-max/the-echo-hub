import { useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { ReflectionInput } from '../../../components/ReflectionInput'
import { SONG_SUGGESTIONS } from '../../../data/missions'
import { useAuth } from '../../../hooks/useAuth'
import { isMeaningfulReflection } from '../../../lib/reflection'

export function SendSongPage() {
  const { completeActivity } = useAuth()
  const [selected, setSelected] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [triedEmpty, setTriedEmpty] = useState(false)
  const [sent, setSent] = useState(false)

  const messageReady = isMeaningfulReflection(message)

  async function handleSend() {
    if (selected === null) return
    if (!messageReady) {
      setTriedEmpty(true)
      return
    }
    await completeActivity('send-song')
    setSent(true)
  }

  return (
    <div>
      <PageHeader title="🎧 SEND A SONG" subtitle="ส่งเพลงหนึ่งเพลง เพื่อบอกใครสักคนว่าเราเป็นห่วง" />

      <div className="flex flex-col gap-3 px-5 pb-4">
        {sent ? (
          <Card className="items-center text-center">
            <p className="text-3xl" aria-hidden>
              🎵
            </p>
            <p className="mt-2 font-semibold text-ink">ส่งเพลงแล้ว!</p>
            <p className="mt-1 text-sm text-ink-soft">
              "{SONG_SUGGESTIONS[selected ?? 0].title}" ถูกส่งไปให้คนที่คุณนึกถึงเรียบร้อยแล้ว
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              สิ่งเล็ก ๆ ที่เราพูดหรือทำ อาจมีความหมายกับใครบางคนมากกว่าที่คิด
            </p>
          </Card>
        ) : (
          <>
            <p className="text-sm text-ink-soft">เลือกเพลงที่อยากส่งให้ใครสักคนวันนี้</p>
            {SONG_SUGGESTIONS.map((song, index) => (
              <Card
                key={song.title}
                onClick={() => setSelected(index)}
                className={`cursor-pointer transition ${
                  selected === index ? 'ring-2 ring-lavender-400' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    🎧
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{song.title}</p>
                    <p className="text-xs text-ink-soft">{song.artist}</p>
                    <p className="mt-1 text-xs text-lavender-600">{song.note}</p>
                  </div>
                </div>
              </Card>
            ))}

            {selected !== null ? (
              <ReflectionInput
                title="อยากบอกอะไรผ่านเพลงนี้? 🎧"
                prompt="เขียนข้อความสั้น ๆ ที่คุณอยากส่งไปพร้อมกับเพลง"
                placeholder="ฟังเพลงนี้แล้วนึกถึงเธอ เลยอยากส่งให้ หวังว่าวันนี้จะดีขึ้นนะ"
                value={message}
                onChange={(v) => {
                  setMessage(v)
                  if (triedEmpty) setTriedEmpty(false)
                }}
                showHint={triedEmpty && !messageReady}
              />
            ) : null}

            <Button
              fullWidth
              className="mt-2"
              disabled={selected === null || !messageReady}
              onClick={handleSend}
            >
              ส่งเพลงและข้อความ
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
