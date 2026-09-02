import { useEffect, useRef, useState } from 'react'
import type { GardenTrack } from '../../../data/gardenTracks'

/**
 * Minimal shape of the bits of the YouTube IFrame Player API we use.
 * No @types/youtube dependency — this app has no other reason to add one.
 */
interface YTPlayerInstance {
  playVideo: () => void
  pauseVideo: () => void
  mute: () => void
  unMute: () => void
  setVolume: (v: number) => void
  destroy: () => void
}

interface YTPlayerOptions {
  videoId: string
  width?: string | number
  height?: string | number
  playerVars?: Record<string, number>
  events?: {
    onReady?: (event: { target: YTPlayerInstance }) => void
    onStateChange?: (event: { data: number }) => void
    onError?: () => void
  }
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: YTPlayerOptions) => YTPlayerInstance
      PlayerState: { PLAYING: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const MUSIC_ENABLED_KEY = 'echoHub.garden.music.enabled'
const MUSIC_VOLUME_KEY = 'echoHub.garden.music.volume'

/** Whether Garden Music should attempt to autoplay on entry — false once the student has
 * manually paused or muted it, so we never fight a preference they already expressed. */
function readMusicEnabledPreference(): boolean {
  try {
    const raw = localStorage.getItem(MUSIC_ENABLED_KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}

function writeMusicEnabledPreference(enabled: boolean) {
  try {
    localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? '1' : '0')
  } catch {
    // Best-effort only — a private/blocked storage context just means the preference
    // resets next visit, which is harmless.
  }
}

function readMusicVolumePreference(): number {
  try {
    const raw = localStorage.getItem(MUSIC_VOLUME_KEY)
    const n = raw === null ? NaN : Number(raw)
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 70
  } catch {
    return 70
  }
}

function writeMusicVolumePreference(volume: number) {
  try {
    localStorage.setItem(MUSIC_VOLUME_KEY, String(volume))
  } catch {
    // Best-effort only, see above.
  }
}

let apiLoadPromise: Promise<void> | null = null

function loadYouTubeIframeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT?.Player) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    let settled = false
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (!settled) {
        settled = true
        resolve()
      }
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      if (!settled) {
        settled = true
        reject(new Error('ไม่สามารถโหลด YouTube player ได้'))
      }
    }
    document.head.appendChild(script)
    window.setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('โหลด YouTube player ไม่สำเร็จ (หมดเวลา)'))
      }
    }, 8000)
  })
  return apiLoadPromise
}

/**
 * Kicks off loading the official YouTube IFrame API script, without creating a player —
 * safe to call from the "เข้าสวน" buttons themselves (HomePage / AvatarStudioPage), right
 * inside their onClick, before navigation to the Garden even happens. That click is a real
 * user gesture; starting the script fetch immediately shrinks the gap between it and the
 * eventual playVideo() call once the Garden mounts, which is what autoplay policies key
 * off of. Idempotent (backed by the same singleton promise `ensurePlayer` uses below).
 */
export function primeGardenMusicPlayer() {
  loadYouTubeIframeAPI().catch(() => {
    // Ignored here — useGardenMusic's own ensurePlayer() surfaces the real error state
    // once the Garden page actually tries to build a player.
  })
}

export type GardenMusicStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Ambient Garden Music player — separate from Song Tree. Lazily loads the official
 * YouTube IFrame Player API, and keeps a single hidden player instance alive for as long
 * as this hook stays mounted so switching between Garden panels never restarts or
 * interrupts playback. The host component is responsible for mounting this once at the
 * EchoGardenPage level (not per panel) and for unmounting it on exit, which destroys the
 * player.
 *
 * Autoplay: EchoGardenPage calls `attemptAutoplay()` once, right when the Garden mounts
 * (see the flow in the Garden Music spec — "เข้าสวน" is the user gesture this rides on).
 * If the browser silently blocks it, `autoplayBlocked` flips true so the HUD can show a
 * small "🎧 แตะเพื่อเปิดเพลง" button — one direct tap on that always succeeds. Never
 * attempted at all if the student previously paused/muted Garden Music (see
 * MUSIC_ENABLED_KEY) — that preference is never overridden automatically.
 */
export function useGardenMusic(track: GardenTrack) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayerInstance | null>(null)
  const pendingPlayRef = useRef(false)
  const autoplayWatchRef = useRef(false)
  const [status, setStatus] = useState<GardenMusicStatus>('idle')
  const [isPlaying, setIsPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(readMusicVolumePreference)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  useEffect(
    () => () => {
      playerRef.current?.destroy()
      playerRef.current = null
    },
    [],
  )

  function ensurePlayer() {
    if (playerRef.current || status === 'loading' || status === 'error') return
    if (!hostRef.current) return
    setStatus('loading')
    loadYouTubeIframeAPI()
      .then(() => {
        if (!hostRef.current || !window.YT) return
        playerRef.current = new window.YT.Player(hostRef.current, {
          videoId: track.youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1, rel: 0 },
          events: {
            onReady: (e) => {
              e.target.setVolume(volume)
              setStatus('ready')
              if (pendingPlayRef.current) {
                pendingPlayRef.current = false
                e.target.playVideo()
              }
            },
            onStateChange: (e) => {
              const playing = e.data === window.YT?.PlayerState.PLAYING
              setIsPlaying(playing)
              // Confirms an in-flight autoplay attempt actually started — cancels the
              // "assume blocked" timeout below so the fallback button never flashes on
              // a successful autoplay.
              if (playing) autoplayWatchRef.current = false
            },
            onError: () => setStatus('error'),
          },
        })
      })
      .catch(() => setStatus('error'))
  }

  function play() {
    setAutoplayBlocked(false)
    writeMusicEnabledPreference(true)
    if (status === 'ready' && playerRef.current) {
      playerRef.current.playVideo()
      return
    }
    pendingPlayRef.current = true
    ensurePlayer()
  }

  function pause() {
    pendingPlayRef.current = false
    writeMusicEnabledPreference(false)
    playerRef.current?.pauseVideo()
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    writeMusicEnabledPreference(!next)
    if (next) playerRef.current?.mute()
    else playerRef.current?.unMute()
  }

  /**
   * ECHO ธรรมอุทยาน map-declutter pass — Temple Grounds spec §12: "optionally lower Garden
   * music volume slightly" while inside the quiet zone. Deliberately NOT built on top of
   * changeVolume() above: that function persists to MUSIC_VOLUME_KEY and updates the
   * `volume` React state (the student's own explicit slider preference) — calling it
   * automatically on zone entry/exit would silently overwrite that preference, and a
   * manual slider adjustment made while ducked would get clobbered the moment the student
   * leaves the zone. duckVolume/restoreVolume instead call the player directly and never
   * touch localStorage or `volume` state, so the student's real preference is untouched
   * and always what gets restored to.
   */
  function duckVolume(factor: number) {
    if (!playerRef.current || muted) return
    playerRef.current.setVolume(Math.round(volume * factor))
  }

  function restoreVolume() {
    if (!playerRef.current || muted) return
    playerRef.current.setVolume(volume)
  }

  function changeVolume(v: number) {
    setVolume(v)
    writeMusicVolumePreference(v)
    playerRef.current?.setVolume(v)
    if (v === 0 && !muted) {
      setMuted(true)
      writeMusicEnabledPreference(false)
      playerRef.current?.mute()
    } else if (v > 0 && muted) {
      setMuted(false)
      writeMusicEnabledPreference(true)
      playerRef.current?.unMute()
    }
  }

  /**
   * Called once when the Garden mounts (see EchoGardenPage) to attempt autoplay while the
   * "เข้าสวน" gesture is still recent. Never overrides a prior pause/mute preference. If
   * playback hasn't actually started within a few seconds, assumes the browser silently
   * blocked it and surfaces the small "แตะเพื่อเปิดเพลง" fallback instead of an error.
   */
  function attemptAutoplay() {
    if (status === 'error') return
    if (!readMusicEnabledPreference()) return
    autoplayWatchRef.current = true
    play()
    window.setTimeout(() => {
      if (autoplayWatchRef.current) {
        autoplayWatchRef.current = false
        setAutoplayBlocked(true)
      }
    }, 2500)
  }

  return {
    hostRef,
    status,
    isPlaying,
    muted,
    volume,
    autoplayBlocked,
    play,
    pause,
    toggleMute,
    changeVolume,
    attemptAutoplay,
    duckVolume,
    restoreVolume,
  }
}
