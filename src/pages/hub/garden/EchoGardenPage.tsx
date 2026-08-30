import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatRequestModal } from '../../../components/ChatRequestModal'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { useAuth } from '../../../hooks/useAuth'
import { useChatRequest } from '../../../hooks/useChatRequest'
import { detectWebGL } from '../../../features/garden/detectWebGL'
import { avatarProfileService } from '../../../features/garden/avatarProfileService'
import { gardenSeatService } from '../../../features/garden/gardenSeatService'
import { gardenEmoteService } from '../../../features/garden/gardenEmoteService'
import { DEFAULT_GARDEN_AVATAR_CONFIG } from '../../../data/gardenAvatarOptions'
import { DEFAULT_GARDEN_TRACK } from '../../../data/gardenTracks'
import { getGardenEmote, type GardenEmoteId } from '../../../data/gardenEmotes'
import { useGardenPresence } from '../../../hooks/useGardenPresence'
import { useGardenPlayers } from '../../../hooks/useGardenPlayers'
import { useGardenSeats } from '../../../hooks/useGardenSeats'
import { awardDailyMission } from '../../../features/rewards/rewardsService'
import { getBangkokDateString } from '../../../lib/thailandDate'
import { GardenLoadingScreen } from './GardenLoadingScreen'
import { Garden2DFallback } from './Garden2DFallback'
import { GardenErrorBoundary } from './GardenErrorBoundary'
import { GardenHUD } from './GardenHUD'
import { GardenSettingsPanel } from './GardenSettingsPanel'
import { GardenEmotePanel } from './GardenEmotePanel'
import { GardenChatPanel } from './GardenChatPanel'
import { GardenWorldChatPanel } from './GardenWorldChatPanel'
import { GardenOnlinePanel } from './GardenOnlinePanel'
import { GardenNearbyPlayerCard } from './GardenNearbyPlayerCard'
import { SongTreeModal } from './modals/SongTreeModal'
import { KindWordModal } from './modals/KindWordModal'
import { ListeningStoneModal } from './modals/ListeningStoneModal'
import { PrivateBenchModal } from './modals/PrivateBenchModal'
import { useGardenControls, useGardenControlMode } from './three/useGardenControls'
import { useGardenQuality } from './three/useGardenQuality'
import { useGardenMusic } from './useGardenMusic'
import { GARDEN_OBJECTS, pickSpawnPoint, type GardenObjectDef } from './three/gardenLayout'
import type { GardenMember } from '../../../features/garden/types'

const GardenScene = lazy(() =>
  import('./three/GardenScene').then((m) => ({ default: m.GardenScene })),
)

type Panel = 'chat' | 'online' | 'activities' | 'settings' | 'emote' | 'song' | 'kind-word' | 'stone' | 'bench' | null

/** How long a student must stay in the Garden before the daily "เข้า ECHO GARDEN" mission counts. */
const GARDEN_MISSION_DWELL_MS = 45_000

export function EchoGardenPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const chatRequest = useChatRequest()
  const controls = useGardenControls()
  const [controlMode, setControlMode] = useGardenControlMode()
  const quality = useGardenQuality()
  const music = useGardenMusic(DEFAULT_GARDEN_TRACK)

  const [webglOk, setWebglOk] = useState<boolean | null>(null)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const [nearestId, setNearestId] = useState<GardenObjectDef['id'] | null>(null)
  const [nearestPlayerId, setNearestPlayerId] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [spawn] = useState<[number, number]>(() => pickSpawnPoint())

  // Garden V2: seats + emotes.
  const [nearestSeatId, setNearestSeatId] = useState<string | null>(null)
  const [sittingSeatId, setSittingSeatId] = useState<string | null>(null)
  const [inDanceZone, setInDanceZone] = useState(false)
  const [myEmote, setMyEmote] = useState<{ emote: GardenEmoteId; startedAt: number } | null>(null)
  const emoteTimeoutRef = useRef<number | null>(null)
  const seatOccupancy = useGardenSeats()

  const avatarConfig = user
    ? (avatarProfileService.getConfig(user.id) ?? DEFAULT_GARDEN_AVATAR_CONFIG)
    : DEFAULT_GARDEN_AVATAR_CONFIG

  const members = useGardenPlayers()
  const { reportLocalMove } = useGardenPresence(avatarConfig, spawn)
  const nearestPlayer = useMemo(
    () => members.find((m) => m.id === nearestPlayerId) ?? null,
    [members, nearestPlayerId],
  )

  useEffect(() => {
    setWebglOk(detectWebGL())
  }, [])

  // Attempt Garden Music autoplay exactly once, right as the Garden mounts — riding on
  // the "เข้าสวน" press that got the student here (see useGardenMusic's attemptAutoplay
  // doc comment for the full autoplay/fallback flow). Runs regardless of 2D/3D mode since
  // the hidden player host is always mounted below either way.
  useEffect(() => {
    music.attemptAutoplay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onVisibility() {
      setPageVisible(!document.hidden)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (user && !avatarProfileService.hasConfig(user.id)) {
      navigate('/hub/garden/studio', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Daily "เข้า ECHO GARDEN" mission — awarded after staying a little while, not just
  // opening the page and immediately leaving (see the 16-section spec's "avoid accidental
  // farming" requirement). Cleared on unmount, so leaving early never awards it.
  useEffect(() => {
    if (!user?.id) return
    const timer = window.setTimeout(() => {
      void awardDailyMission(user.id, 'garden', getBangkokDateString())
    }, GARDEN_MISSION_DWELL_MS)
    return () => window.clearTimeout(timer)
  }, [user?.id])

  // Garden V2 req. #16: "leaves Garden" is one of the explicit auto-release triggers, same
  // rank as pressing stand or disconnecting — releaseSeat() is a safe no-op if nothing is
  // currently held, so this can run unconditionally on unmount (route change, tab close
  // handled separately by the RTDB onDisconnect registered at claim time).
  useEffect(() => {
    return () => {
      gardenSeatService.releaseSeat()
      if (emoteTimeoutRef.current != null) window.clearTimeout(emoteTimeoutRef.current)
    }
  }, [])

  if (!user) return null
  if (!avatarProfileService.hasConfig(user.id)) return null
  if (!user.publicId) return null
  const currentUser = { id: user.id, codename: user.codename ?? 'You', avatarId: user.avatarId }
  // Garden-facing identity — publicId only, never the raw Firebase uid (shared with everyone in the garden).
  const gardenUser = { id: user.publicId, codename: user.codename ?? 'You', avatarId: user.avatarId }

  // Every "ขอคุยส่วนตัว" entry point in the Garden (nearby-player card, Online panel,
  // Private Bench) funnels through here before reaching the existing Phase 3
  // chatRequest.request() — same target shape, same modal, same Firestore-backed flow.
  // This only double-checks that the Garden roster resolved a real identifier (a
  // GardenMember.id is always the target's publicId, sourced from /gardenPresence — see
  // gardenPresenceService.ts) and logs *why* if it ever didn't, without ever logging the
  // publicId/uid/email itself.
  function handleGardenChatRequest(member: GardenMember) {
    if (!member.id || member.id === gardenUser.id) {
      console.error('[garden] chat request blocked before opening the confirm modal', {
        hasTargetId: !!member.id,
        targetIsSelf: member.id === gardenUser.id,
      })
      window.alert('ส่งคำขอคุยไม่สำเร็จ ลองใหม่อีกครั้ง')
      return
    }
    chatRequest.request(member)
  }

  function handleSelectObject(id: GardenObjectDef['id']) {
    if (id === 'exit') {
      navigate('/hub')
      return
    }
    if (id === 'song-tree') setPanel('song')
    else if (id === 'kind-word') setPanel('kind-word')
    else if (id === 'listening-stone-1' || id === 'listening-stone-2') setPanel('stone')
    else if (id === 'bench-1' || id === 'bench-2') setPanel('bench')
  }

  // Garden V2 seat system — see gardenSeatService.ts for the race-safe RTDB transaction
  // this wraps. A failed claim (someone else won the race, e.g. spec test #39 "B tries
  // same chair → blocked") just silently leaves the player standing; the seat's own
  // occupancy state (already live via useGardenSeats) is what makes the HUD prompt
  // disappear once it's actually taken, so there's nothing else to reconcile here.
  async function handleSit(seatId: string) {
    const claimed = await gardenSeatService.claimSeat(seatId, gardenUser.id)
    if (claimed) setSittingSeatId(seatId)
  }

  function handleStand() {
    if (!sittingSeatId) return
    gardenSeatService.releaseSeat()
    setSittingSeatId(null)
  }

  // Garden V2 emotes — see gardenEmoteService.ts: only {emote, startedAt} is ever synced,
  // never animation frames. Optimistic local update so the local player's own avatar
  // plays it immediately, independent of the network round-trip (same pattern as every
  // other local-vs-remote split in this file, e.g. reportLocalMove vs the members roster).
  function handleSelectEmote(emote: GardenEmoteId) {
    if (emoteTimeoutRef.current != null) window.clearTimeout(emoteTimeoutRef.current)
    const startedAt = Date.now()
    setMyEmote({ emote, startedAt })
    gardenEmoteService.setEmote(gardenUser.id, emote)
    const def = getGardenEmote(emote)
    if (def && !def.loop) {
      emoteTimeoutRef.current = window.setTimeout(() => {
        setMyEmote((current) => (current?.startedAt === startedAt ? null : current))
        gardenEmoteService.clearEmote(gardenUser.id)
      }, def.durationMs)
    }
  }

  function handleStopEmote() {
    if (emoteTimeoutRef.current != null) {
      window.clearTimeout(emoteTimeoutRef.current)
      emoteTimeoutRef.current = null
    }
    setMyEmote(null)
    gardenEmoteService.clearEmote(gardenUser.id)
  }

  // Garden V2 req. #24: tapping a movement destination (or keyboard/joystick — see
  // GardenPlayer.tsx's onMovementStart, edge-triggered the instant real movement starts)
  // stops any standing emote. Never fires while seated (movement input is ignored
  // entirely then), so it can never interrupt "sitting" itself.
  function handleMovementStart() {
    if (myEmote) handleStopEmote()
  }

  const nearestDef = GARDEN_OBJECTS.find((o) => o.id === nearestId) ?? null

  // One prompt at a time, in priority order: standing up beats everything else once
  // seated; a free seat beats the ordinary GARDEN_OBJECTS prompt beats the dance floor —
  // GardenHUD itself is unaware of any of this, it just renders whatever single
  // {icon,label} this resolves to (see GardenHUD's existing interaction/onInteract props).
  const interaction = sittingSeatId
    ? { icon: '🧍', label: 'ลุกขึ้น' }
    : nearestSeatId
      ? { icon: '🪑', label: 'นั่ง' }
      : nearestDef
        ? { icon: nearestDef.icon, label: nearestDef.label }
        : inDanceZone
          ? { icon: '💃', label: 'เต้น' }
          : null

  function handleInteract() {
    if (sittingSeatId) {
      handleStand()
    } else if (nearestSeatId) {
      void handleSit(nearestSeatId)
    } else if (nearestId) {
      handleSelectObject(nearestId)
    } else if (inDanceZone) {
      setPanel('emote')
    }
  }

  const musicProps = {
    track: DEFAULT_GARDEN_TRACK,
    status: music.status,
    isPlaying: music.isPlaying,
    muted: music.muted,
    volume: music.volume,
    autoplayBlocked: music.autoplayBlocked,
    onPlay: music.play,
    onPause: music.pause,
    onToggleMute: music.toggleMute,
    onChangeVolume: music.changeVolume,
  }

  const fallback2DProps = {
    memberCount: members.length + 1,
    onOpenChat: () => setPanel('chat'),
    onOpenOnline: () => setPanel('online'),
    onOpenSong: () => setPanel('song'),
    onOpenKindWord: () => setPanel('kind-word'),
    onOpenStone: () => setPanel('stone'),
    onOpenBench: () => setPanel('bench'),
    onExit: () => navigate('/hub'),
  }

  return (
    <div className="fixed inset-0 z-50 bg-cream">
      {/* Hidden YouTube player host — mounted once here so playback survives panel switches. */}
      <div ref={music.hostRef} className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" />

      {webglOk === null ? (
        <GardenLoadingScreen />
      ) : webglOk === false ? (
        <div className="h-full overflow-y-auto pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="mb-2 flex items-center justify-between px-5">
            <h1 className="text-xl font-bold text-ink">🌿 ECHO GARDEN</h1>
            <button type="button" onClick={() => navigate('/hub')} className="text-sm text-ink-soft">
              ✕ ปิด
            </button>
          </div>
          <Garden2DFallback {...fallback2DProps} />
        </div>
      ) : (
        <GardenErrorBoundary
          fallback={
            <div className="h-full overflow-y-auto pt-[max(env(safe-area-inset-top),1rem)]">
              <div className="mb-2 flex items-center justify-between px-5">
                <h1 className="text-xl font-bold text-ink">🌿 ECHO GARDEN</h1>
                <button type="button" onClick={() => navigate('/hub')} className="text-sm text-ink-soft">
                  ✕ ปิด
                </button>
              </div>
              <p className="px-5 text-xs text-ink-faint">โหมด 3 มิติมีปัญหา แสดงเวอร์ชัน 2 มิติแทน</p>
              <Garden2DFallback {...fallback2DProps} />
            </div>
          }
        >
          <Suspense fallback={<GardenLoadingScreen />}>
            <div className="flex h-full w-full">
              <div className="relative h-full flex-1">
                <GardenScene
                  controls={controls}
                  playerAvatarConfig={avatarConfig}
                  spawn={spawn}
                  members={members}
                  seatOccupancy={seatOccupancy}
                  sittingSeatId={sittingSeatId}
                  emote={myEmote?.emote ?? null}
                  emoteStartedAt={myEmote?.startedAt ?? null}
                  onNearestChange={setNearestId}
                  onNearestPlayerChange={setNearestPlayerId}
                  onNearestSeatChange={setNearestSeatId}
                  onDanceZoneChange={setInDanceZone}
                  onMovementStart={handleMovementStart}
                  onLocalMove={reportLocalMove}
                  paused={!pageVisible}
                  quality={quality.settings}
                  onFrame={quality.reportFrame}
                />
                <GardenHUD
                  controls={controls}
                  controlMode={controlMode}
                  memberCount={members.length + 1}
                  interaction={interaction}
                  onInteract={handleInteract}
                  onOpenChat={() => setPanel('chat')}
                  onOpenActivities={() => setPanel('activities')}
                  onOpenOnline={() => setPanel('online')}
                  onOpenEmotes={() => setPanel('emote')}
                  onOpenSettings={() => setPanel('settings')}
                  onExit={() => navigate('/hub')}
                  onRecenterCamera={() => {
                    controls.cameraRecenterRequestRef.current = true
                  }}
                  music={musicProps}
                />
                {nearestPlayer ? (
                  <GardenNearbyPlayerCard
                    member={nearestPlayer}
                    onGreet={() => window.alert(`ทักทาย ${nearestPlayer.codename} แล้ว 👋`)}
                    onRequestChat={() => handleGardenChatRequest(nearestPlayer)}
                  />
                ) : null}
              </div>
              {/* Desktop/tablet-landscape only — persistent, open-by-default World Chat
                  (see spec). The flex row above reserves real layout space for it so the
                  3D canvas resizes around it (R3F handles the resize automatically)
                  instead of the panel covering any HUD element. Mobile still uses the
                  floating 💬 nav button -> the full-screen `panel === 'chat'` overlay
                  below, unchanged. */}
              <GardenWorldChatPanel currentUser={gardenUser} />
            </div>
          </Suspense>
        </GardenErrorBoundary>
      )}

      {/* Panels shared between 2D and 3D modes */}
      {panel === 'chat' ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-cream">
          <div className="flex items-center justify-between border-b border-lavender-100 px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
            <p className="font-semibold text-ink">💬 Garden Chat</p>
            <button type="button" onClick={() => setPanel(null)} className="text-ink-soft">
              ปิด ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <GardenChatPanel currentUser={gardenUser} />
          </div>
        </div>
      ) : null}

      {panel === 'online' ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-cream">
          <div className="flex items-center justify-between border-b border-lavender-100 px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
            <p className="font-semibold text-ink">👥 คนที่อยู่ในสวน</p>
            <button type="button" onClick={() => setPanel(null)} className="text-ink-soft">
              ปิด ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <GardenOnlinePanel
              members={members}
              onGreet={(m) => window.alert(`ทักทาย ${m.codename} แล้ว 👋`)}
              onRequestChat={handleGardenChatRequest}
            />
          </div>
        </div>
      ) : null}

      <Modal open={panel === 'activities'} onClose={() => setPanel(null)}>
        <h2 className="text-lg font-bold text-ink">🌳 กิจกรรมในสวน</h2>
        <div className="mt-4 flex flex-col gap-2.5">
          <Button fullWidth variant="secondary" onClick={() => setPanel('song')}>
            🌳 Song Tree
          </Button>
          <Button fullWidth variant="secondary" onClick={() => setPanel('kind-word')}>
            🌼 Kind Word Garden
          </Button>
          <Button fullWidth variant="secondary" onClick={() => setPanel('stone')}>
            🪨 Listening Stone
          </Button>
          <Button fullWidth variant="secondary" onClick={() => setPanel('bench')}>
            🪑 Private Bench
          </Button>
        </div>
      </Modal>

      <Modal open={panel === 'settings'} onClose={() => setPanel(null)}>
        <GardenSettingsPanel
          controlMode={controlMode}
          onControlModeChange={setControlMode}
          qualityMode={quality.mode}
          onQualityModeChange={quality.setMode}
          onEditAvatar={() => navigate('/hub/garden/studio')}
          onClose={() => setPanel(null)}
        />
      </Modal>

      <Modal open={panel === 'emote'} onClose={() => setPanel(null)}>
        <GardenEmotePanel
          onSelectEmote={handleSelectEmote}
          onSit={() => nearestSeatId && void handleSit(nearestSeatId)}
          canSit={!!nearestSeatId && !sittingSeatId}
          onStand={() => {
            if (sittingSeatId) handleStand()
            handleStopEmote()
          }}
          isSeated={!!sittingSeatId}
          onClose={() => setPanel(null)}
        />
      </Modal>

      <SongTreeModal open={panel === 'song'} onClose={() => setPanel(null)} currentUser={currentUser} />
      <KindWordModal open={panel === 'kind-word'} onClose={() => setPanel(null)} currentUser={currentUser} />
      <ListeningStoneModal open={panel === 'stone'} onClose={() => setPanel(null)} currentUser={gardenUser} />
      <PrivateBenchModal
        open={panel === 'bench'}
        onClose={() => setPanel(null)}
        members={members}
        onRequestMember={(m) => {
          setPanel(null)
          handleGardenChatRequest(m)
        }}
      />

      <ChatRequestModal chatRequest={chatRequest} />
    </div>
  )
}
