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

export type GardenMusicStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Ambient Garden Music player — separate from Song Tree. Lazily loads the
 * official YouTube IFrame Player API only once the user presses Play
 * (never autoplays), and keeps a single hidden player instance alive for
 * as long as this hook stays mounted so switching between Garden panels
 * never restarts or interrupts playback. The host component is
 * responsible for mounting this once at the EchoGardenPage level (not per
 * panel) and for unmounting it on exit, which destroys the player.
 */
export function useGardenMusic(track: GardenTrack) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayerInstance | null>(null)
  const pendingPlayRef = useRef(false)
  const [status, setStatus] = useState<GardenMusicStatus>('idle')
  const [isPlaying, setIsPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(70)

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
            onStateChange: (e) => setIsPlaying(e.data === window.YT?.PlayerState.PLAYING),
            onError: () => setStatus('error'),
          },
        })
      })
      .catch(() => setStatus('error'))
  }

  function play() {
    if (status === 'ready' && playerRef.current) {
      playerRef.current.playVideo()
      return
    }
    pendingPlayRef.current = true
    ensurePlayer()
  }

  function pause() {
    pendingPlayRef.current = false
    playerRef.current?.pauseVideo()
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    if (next) playerRef.current?.mute()
    else playerRef.current?.unMute()
  }

  function changeVolume(v: number) {
    setVolume(v)
    playerRef.current?.setVolume(v)
    if (v === 0 && !muted) {
      setMuted(true)
      playerRef.current?.mute()
    } else if (v > 0 && muted) {
      setMuted(false)
      playerRef.current?.unMute()
    }
  }

  return { hostRef, status, isPlaying, muted, volume, play, pause, toggleMute, changeVolume }
}
