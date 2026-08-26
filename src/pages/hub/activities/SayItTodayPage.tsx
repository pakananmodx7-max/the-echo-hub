import { PageHeader } from '../../../components/PageHeader'
import { RandomMissionCard } from '../../../components/RandomMissionCard'
import { SAY_IT_TODAY_MISSIONS } from '../../../data/missions'
import { useAuth } from '../../../hooks/useAuth'

export function SayItTodayPage() {
  const { completeActivity } = useAuth()

  return (
    <div>
      <PageHeader title="💬 SAY IT TODAY" subtitle="วันนี้คุณพูดสิ่งดี ๆ กับใครแล้วหรือยัง?" />
      <div className="px-5 pb-4">
        <RandomMissionCard
          missions={SAY_IT_TODAY_MISSIONS}
          icon="💬"
          onComplete={() => completeActivity('say-it-today')}
        />
      </div>
    </div>
  )
}
