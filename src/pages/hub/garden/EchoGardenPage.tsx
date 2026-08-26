import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatRequestModal } from '../../../components/ChatRequestModal'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { useAuth } from '../../../hooks/useAuth'
import { useChatRequest } from '../../../hooks/useChatRequest'
import { detectWebGL } from '../../../features/garden/detectWebGL'
import { gardenPresenceService } from '../../../features/garden/gardenPresenceService'
import { avatarProfileService } from '../../../features/garden/avatarProfileService'
import { DEFAULT_GARDEN_AVATAR_CONFIG } from '../../../data/gardenAvatarOptions'
import { DEFAULT_GARDEN_TRACK } from '../../../data/gardenTracks'
import { GardenLoadingScreen } from './GardenLoadingScreen'
import { Garden2DFallback } from './Garden2DFallback'
import { GardenErrorBoundary } from './GardenErrorBoundary'
import { GardenHUD } from './GardenHUD'
import { GardenSettingsPanel } from './GardenSettingsPanel'
import { GardenChatPanel } from './GardenChatPanel'
import { GardenOnlinePanel } from './GardenOnlinePanel'
import { SongTreeModal } from './modals/SongTreeModal'
import { KindWordModal } from './modals/KindWordModal'
import { ListeningStoneModal } from './modals/ListeningStoneModal'
import { PrivateBenchModal } from './modals/PrivateBenchModal'
import { useGardenControls, useGardenControlMode } from './three/useGardenControls'
import { useGardenQuality } from './three/useGardenQuality'
import { useGardenMusic } from './useGardenMusic'
import { GARDEN_OBJECTS, type GardenObjectDef } from './three/gardenLayout'

const GardenScene = lazy(() =>
  import('./three/GardenScene').then((m) => ({ default: m.GardenScene })),
)

type Panel = 'chat' | 'online' | 'activities' | 'settings' | 'song' | 'kind-word' | 'stone' | 'bench' | null

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
  const [panel, setPanel] = useState<Panel>(null)

  const members = useMemo(() => gardenPresenceService.listMembers(), [])
  const avatarConfig = user
    ? (avatarProfileService.getConfig(user.id) ?? DEFAULT_GARDEN_AVATAR_CONFIG)
    : DEFAULT_GARDEN_AVATAR_CONFIG

  useEffect(() => {
    setWebglOk(detectWebGL())
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

  if (!user) return null
  if (!avatarProfileService.hasConfig(user.id)) return null
  const currentUser = { id: user.id, codename: user.codename ?? 'You', avatarId: user.avatarId }

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

  const nearestDef = GARDEN_OBJECTS.find((o) => o.id === nearestId) ?? null

  const musicProps = {
    track: DEFAULT_GARDEN_TRACK,
    status: music.status,
    isPlaying: music.isPlaying,
    muted: music.muted,
    volume: music.volume,
    onPlay: music.play,
    onPause: music.pause,
    onToggleMute: music.toggleMute,
    onChangeVolume: music.changeVolume,
  }

  const fallback2DProps = {
    memberCount: members.length,
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
            <div className="relative h-full w-full">
              <GardenScene
                controls={controls}
                playerAvatarConfig={avatarConfig}
                members={members}
                onNearestChange={setNearestId}
                paused={!pageVisible}
                quality={quality.settings}
                onFrame={quality.reportFrame}
              />
              <GardenHUD
                controls={controls}
                controlMode={controlMode}
                memberCount={members.length}
                interaction={nearestDef ? { icon: nearestDef.icon, label: nearestDef.label } : null}
                onInteract={() => nearestId && handleSelectObject(nearestId)}
                onOpenChat={() => setPanel('chat')}
                onOpenActivities={() => setPanel('activities')}
                onOpenOnline={() => setPanel('online')}
                onOpenSettings={() => setPanel('settings')}
                onExit={() => navigate('/hub')}
                music={musicProps}
              />
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
            <GardenChatPanel currentUser={currentUser} />
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
              onRequestChat={(m) => chatRequest.request(m)}
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

      <SongTreeModal open={panel === 'song'} onClose={() => setPanel(null)} currentUser={currentUser} />
      <KindWordModal open={panel === 'kind-word'} onClose={() => setPanel(null)} currentUser={currentUser} />
      <ListeningStoneModal open={panel === 'stone'} onClose={() => setPanel(null)} currentUser={currentUser} />
      <PrivateBenchModal
        open={panel === 'bench'}
        onClose={() => setPanel(null)}
        members={members}
        onRequestMember={(m) => {
          setPanel(null)
          chatRequest.request(m)
        }}
      />

      <ChatRequestModal chatRequest={chatRequest} />
    </div>
  )
}
