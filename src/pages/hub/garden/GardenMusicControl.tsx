import { useState } from 'react'
import type { GardenTrack } from '../../../data/gardenTracks'
import type { GardenMusicStatus } from './useGardenMusic'

interface GardenMusicControlProps {
  track: GardenTrack
  status: GardenMusicStatus
  isPlaying: boolean
  muted: boolean
  volume: number
  onPlay: () => void
  onPause: () => void
  onToggleMute: () => void
  onChangeVolume: (v: number) => void
}

export function GardenMusicControl({
  track,
  status,
  isPlaying,
  muted,
  volume,
  onPlay,
  onPause,
  onToggleMute,
  onChangeVolume,
}: GardenMusicControlProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Garden Music"
        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-lg shadow backdrop-blur-sm"
      >
        <span aria-hidden>{isPlaying ? '🎧 ♪' : '🎧'}</span>
      </button>

      {open ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[60] flex items-end bg-ink/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-white p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-lavender-100" />
            <p className="text-sm font-semibold text-ink">🎧 Garden Music</p>
            <p className="mt-0.5 text-sm text-ink-soft">{track.title}</p>

            {status === 'error' ? (
              <p className="mt-3 text-xs text-pink-text">เล่นเพลงไม่ได้ตอนนี้ ลองใหม่อีกครั้ง หรือเปิดใน YouTube แทน</p>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={isPlaying ? onPause : onPlay}
                disabled={status === 'loading'}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-lavender-500 text-2xl text-white shadow-soft active:scale-95 disabled:opacity-60"
                aria-label={isPlaying ? 'หยุดชั่วคราว' : 'เล่น'}
              >
                {status === 'loading' ? '…' : isPlaying ? '⏸' : '▶'}
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-deep text-lg"
              >
                {muted || volume === 0 ? '🔇' : '🔊'}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => onChangeVolume(Number(e.target.value))}
                className="flex-1 accent-lavender-500"
                aria-label="ระดับเสียง"
              />
            </div>

            <a
              href={`https://youtu.be/${track.youtubeVideoId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-medium text-lavender-600"
            >
              เปิดใน YouTube ↗
            </a>
          </div>
        </div>
      ) : null}
    </>
  )
}
