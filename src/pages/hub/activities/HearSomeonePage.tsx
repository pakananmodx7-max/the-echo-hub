import { PageHeader } from '../../../components/PageHeader'
import { RandomMissionCard } from '../../../components/RandomMissionCard'
import { HEAR_SOMEONE_MISSIONS } from '../../../data/missions'
import { useAuth } from '../../../hooks/useAuth'

export function HearSomeonePage() {
  const { completeActivity } = useAuth()

  return (
    <div>
      <PageHeader title="👂 HEAR SOMEONE" subtitle="วันนี้ลองฟังใครสักคนโดยไม่รีบตัดสิน" />
      <div className="px-5 pb-4">
        <RandomMissionCard
          missions={HEAR_SOMEONE_MISSIONS}
          icon="👂"
          onComplete={() => completeActivity('hear-someone')}
        />
      </div>
    </div>
  )
}
