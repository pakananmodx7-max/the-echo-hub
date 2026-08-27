import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth, RequireOnboarding } from './components/RouteGuards'
import { WelcomePage } from './pages/WelcomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { CreateCodenamePage } from './pages/CreateCodenamePage'
import { MoodCheckinPage } from './pages/MoodCheckinPage'
import { HubLayout } from './pages/hub/HubLayout'
import { HomePage } from './pages/hub/HomePage'
import { EchoSpacePage } from './pages/hub/EchoSpacePage'
import { ActivitiesPage } from './pages/hub/ActivitiesPage'
import { SendSongPage } from './pages/hub/activities/SendSongPage'
import { SayItTodayPage } from './pages/hub/activities/SayItTodayPage'
import { HearSomeonePage } from './pages/hub/activities/HearSomeonePage'
import { TalkPage } from './pages/hub/TalkPage'
import { NotificationsPage } from './pages/hub/NotificationsPage'
import { ChatRequestsPage } from './pages/hub/talk/ChatRequestsPage'
import { PrivateChatPage } from './pages/hub/talk/PrivateChatPage'
import { FriendBondPage } from './pages/hub/friends/FriendBondPage'
import { FriendQuestPage } from './pages/hub/friends/FriendQuestPage'
import { ProfilePage } from './pages/hub/ProfilePage'
import { DrawingHubPage } from './pages/hub/drawing/DrawingHubPage'
import { EchoJournalPage } from './pages/hub/drawing/EchoJournalPage'
import { DrawAndListenPage } from './pages/hub/drawing/DrawAndListenPage'
import { GardenLoadingScreen } from './pages/hub/garden/GardenLoadingScreen'

const EchoGardenPage = lazy(() =>
  import('./pages/hub/garden/EchoGardenPage').then((m) => ({ default: m.EchoGardenPage })),
)
const AvatarStudioPage = lazy(() =>
  import('./pages/hub/garden/studio/AvatarStudioPage').then((m) => ({ default: m.AvatarStudioPage })),
)
const WhoAmIGamePage = lazy(() =>
  import('./pages/hub/friends/whoAmI/WhoAmIGamePage').then((m) => ({ default: m.WhoAmIGamePage })),
)

function SimpleLoadingFallback() {
  return <div className="px-5 pt-24 text-center text-sm text-ink-soft">กำลังโหลด...</div>
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/onboarding/codename" element={<CreateCodenamePage />} />
          <Route path="/onboarding/mood" element={<MoodCheckinPage />} />

          <Route element={<RequireOnboarding />}>
            <Route path="/hub" element={<HubLayout />}>
              <Route index element={<HomePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="space" element={<EchoSpacePage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="activities/send-song" element={<SendSongPage />} />
              <Route path="activities/say-it-today" element={<SayItTodayPage />} />
              <Route path="activities/hear-someone" element={<HearSomeonePage />} />
              <Route path="talk" element={<TalkPage />} />
              <Route path="talk/requests" element={<ChatRequestsPage />} />
              <Route path="talk/chat/:roomId" element={<PrivateChatPage />} />
              <Route
                path="garden"
                element={
                  <Suspense fallback={<GardenLoadingScreen />}>
                    <EchoGardenPage />
                  </Suspense>
                }
              />
              <Route
                path="garden/studio"
                element={
                  <Suspense fallback={<GardenLoadingScreen />}>
                    <AvatarStudioPage />
                  </Suspense>
                }
              />
              <Route path="draw" element={<DrawingHubPage />} />
              <Route path="draw/journal" element={<EchoJournalPage />} />
              <Route path="draw/listen" element={<DrawAndListenPage />} />
              <Route path="friends" element={<FriendBondPage />} />
              <Route path="friends/quest" element={<FriendQuestPage />} />
              <Route
                path="friends/who-am-i"
                element={
                  <Suspense fallback={<SimpleLoadingFallback />}>
                    <WhoAmIGamePage />
                  </Suspense>
                }
              />
              <Route path="me" element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
