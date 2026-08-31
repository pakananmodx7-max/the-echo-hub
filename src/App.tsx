import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { RequireAuth, RequireOnboarding } from './components/RouteGuards'
import { WelcomePage } from './pages/WelcomePage'
import { LoginPage } from './pages/LoginPage'
import { GardenLoadingScreen } from './pages/hub/garden/GardenLoadingScreen'

// Only the very first screen an unauthenticated visitor sees (Welcome) and the near-certain
// next click (Login) are bundled eagerly — everything reachable only after signing in is
// lazy-loaded, so the initial Login/Welcome paint never waits on hub/chat/Garden/game code.
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const CreateCodenamePage = lazy(() => import('./pages/CreateCodenamePage').then((m) => ({ default: m.CreateCodenamePage })))
const MoodCheckinPage = lazy(() => import('./pages/MoodCheckinPage').then((m) => ({ default: m.MoodCheckinPage })))

const HubLayout = lazy(() => import('./pages/hub/HubLayout').then((m) => ({ default: m.HubLayout })))
const HomePage = lazy(() => import('./pages/hub/HomePage').then((m) => ({ default: m.HomePage })))
const EchoSpacePage = lazy(() => import('./pages/hub/EchoSpacePage').then((m) => ({ default: m.EchoSpacePage })))
const ActivitiesPage = lazy(() => import('./pages/hub/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })))
const SayItTodayPage = lazy(() => import('./pages/hub/activities/SayItTodayPage').then((m) => ({ default: m.SayItTodayPage })))
const HearSomeonePage = lazy(() => import('./pages/hub/activities/HearSomeonePage').then((m) => ({ default: m.HearSomeonePage })))
const DailyJournalPage = lazy(() => import('./pages/hub/activities/DailyJournalPage').then((m) => ({ default: m.DailyJournalPage })))
const TalkPage = lazy(() => import('./pages/hub/TalkPage').then((m) => ({ default: m.TalkPage })))
const NotificationsPage = lazy(() => import('./pages/hub/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const ChatRequestsPage = lazy(() => import('./pages/hub/talk/ChatRequestsPage').then((m) => ({ default: m.ChatRequestsPage })))
const PrivateChatPage = lazy(() => import('./pages/hub/talk/PrivateChatPage').then((m) => ({ default: m.PrivateChatPage })))
const FriendBondPage = lazy(() => import('./pages/hub/friends/FriendBondPage').then((m) => ({ default: m.FriendBondPage })))
const FriendQuestPage = lazy(() => import('./pages/hub/friends/FriendQuestPage').then((m) => ({ default: m.FriendQuestPage })))
const ProfilePage = lazy(() => import('./pages/hub/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const DrawingHubPage = lazy(() => import('./pages/hub/drawing/DrawingHubPage').then((m) => ({ default: m.DrawingHubPage })))
const EchoJournalPage = lazy(() => import('./pages/hub/drawing/EchoJournalPage').then((m) => ({ default: m.EchoJournalPage })))
const DrawAndListenPage = lazy(() => import('./pages/hub/drawing/DrawAndListenPage').then((m) => ({ default: m.DrawAndListenPage })))

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
    <ThemeProvider>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/register"
          element={
            <Suspense fallback={<SimpleLoadingFallback />}>
              <RegisterPage />
            </Suspense>
          }
        />

        <Route element={<RequireAuth />}>
          <Route
            path="/onboarding/codename"
            element={
              <Suspense fallback={<SimpleLoadingFallback />}>
                <CreateCodenamePage />
              </Suspense>
            }
          />
          <Route
            path="/onboarding/mood"
            element={
              <Suspense fallback={<SimpleLoadingFallback />}>
                <MoodCheckinPage />
              </Suspense>
            }
          />

          <Route element={<RequireOnboarding />}>
            <Route
              path="/hub"
              element={
                <Suspense fallback={<SimpleLoadingFallback />}>
                  <HubLayout />
                </Suspense>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="space" element={<EchoSpacePage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              {/* Send a Song was removed — redirect any old bookmark/link safely instead of a broken page. */}
              <Route path="activities/send-song" element={<Navigate to="/hub/activities" replace />} />
              <Route path="activities/say-it-today" element={<SayItTodayPage />} />
              <Route path="activities/hear-someone" element={<HearSomeonePage />} />
              <Route path="activities/daily-journal" element={<DailyJournalPage />} />
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
    </ThemeProvider>
  )
}

export default App
