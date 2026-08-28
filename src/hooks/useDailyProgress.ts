import { useEffect, useState } from 'react'
import { subscribeDailyProgress, type DailyProgress } from '../features/rewards/rewardsService'

/** Live view of one Bangkok calendar day's mission/points progress for the given account. */
export function useDailyProgress(uid: string | null | undefined, dateStr: string): DailyProgress {
  const [progress, setProgress] = useState<DailyProgress>({
    date: dateStr,
    checkinCompleted: false,
    missionsCompleted: [],
    pointsEarned: 0,
  })

  useEffect(() => {
    if (!uid) return
    return subscribeDailyProgress(uid, dateStr, setProgress)
  }, [uid, dateStr])

  return progress
}
