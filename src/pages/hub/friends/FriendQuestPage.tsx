import { PageHeader } from '../../../components/PageHeader'
import { RandomMissionCard } from '../../../components/RandomMissionCard'
import { FRIEND_QUEST_MISSIONS } from '../../../data/missions'
import { useAuth } from '../../../hooks/useAuth'

export function FriendQuestPage() {
  const { completeActivity } = useAuth()

  return (
    <div>
      <PageHeader title="🎲 Friend Quest" subtitle="ทำภารกิจนี้ร่วมกับเพื่อนของคุณ" />
      <div className="px-5 pb-4">
        <RandomMissionCard
          missions={FRIEND_QUEST_MISSIONS}
          icon="🫶"
          onComplete={() => completeActivity('friend-bond')}
        />
      </div>
    </div>
  )
}
