import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatRequestModal } from '../../../components/ChatRequestModal'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { useAuth } from '../../../hooks/useAuth'
import { useChatRequest } from '../../../hooks/useChatRequest'
import { detectWebGL } from '../../../features/garden/detectWebGL'
import { gardenPresenceService } from '../../../features/garden/gardenPresenceService'
import { GardenLoadingScreen } from './GardenLoadingScreen'
import { Garden2DFallback } from './Garden2DFallback'
import { GardenErrorBoundary } from './GardenErrorBoundary'
import { GardenHUD } from './GardenHUD'
import { GardenChatPanel } from './GardenChatPanel'
import { GardenOnlinePanel } from './GardenOnlinePanel'
import { SongTreeModal } from './modals/SongTreeModal'
import { KindWordModal } from './modals/KindWordModal'
import { ListeningStoneModal } from './modals/ListeningStoneModal'
import { PrivateBenchModal } from './modals/PrivateBenchModal'
import { useGardenControls } from './three/useGardenControls'
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

  const [webglOk, setWebglOk] = useState<boolean | null>(null)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const [nearestId, setNearestId] = useState<GardenObjectDef['id'] | null>(null)
  const [panel, setPanel] = useState<Panel>(null)

  const members = useMemo(() => gardenPresenceService.listMembers(), [])

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

  if (!user) return null
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
                playerAvatarId={currentUser.avatarId}
                members={members}
                nearestId={nearestId}
                onNearestChange={setNearestId}
                onSelectObject={handleSelectObject}
                paused={!pageVisible}
              />
              <GardenHUD
                controls={controls}
                memberCount={members.length}
                interaction={nearestDef ? { icon: nearestDef.icon, label: nearestDef.label } : null}
                onInteract={() => nearestId && handleSelectObject(nearestId)}
                onOpenChat={() => setPanel('chat')}
                onOpenActivities={() => setPanel('activities')}
                onOpenOnline={() => setPanel('online')}
                onOpenSettings={() => setPanel('settings')}
                onExit={() => navigate('/hub')}
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
        <h2 className="text-lg font-bold text-ink">⚙️ การตั้งค่าสวน</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          ECHO GARDEN แสดง Codename, Avatar และ Mood ของคุณเท่านั้น ไม่แสดงชื่อจริง อีเมล
          หรือข้อมูลส่วนตัวอื่น ๆ ข้อมูลในสวนเวอร์ชันนี้เป็นข้อมูลทดลอง (Demo) และเก็บไว้ในเครื่องของคุณเท่านั้น
        </p>
        <Button fullWidth className="mt-4" onClick={() => setPanel(null)}>
          เข้าใจแล้ว
        </Button>
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
