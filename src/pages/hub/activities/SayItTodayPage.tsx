import { PageHeader } from '../../../components/PageHeader'
import { RandomMissionCard } from '../../../components/RandomMissionCard'
import { SAY_IT_TODAY_MISSIONS } from '../../../data/missions'
import { recordActivity } from '../../../features/analytics/analyticsService'
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
          onComplete={() => {
            void completeActivity('say-it-today')
            void recordActivity('sayItToday')
          }}
          completeLabel="ส่งภารกิจ"
          reflection={{
            title: 'ลองเขียนสิ่งที่คุณจะพูด 💬',
            prompt: 'ถ้าคุณจะพูดสิ่งนี้กับเขาจริง ๆ คุณจะพูดยังไง?',
            placeholder: 'เช่น ขอบคุณนะที่อยู่ข้าง ๆ เราเสมอ เราดีใจที่มีเธอเป็นเพื่อน',
            helper: 'เขียนในแบบของคุณเอง ไม่ต้องยาวก็ได้',
          }}
        />
      </div>
    </div>
  )
}
