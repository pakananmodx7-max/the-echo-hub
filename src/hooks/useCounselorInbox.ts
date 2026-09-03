import { useEffect, useState } from 'react'
import { counselorBridge, type CounselorThread } from '../features/counselor/counselorBridge'

/** Admin-side: the whole counselor inbox in one shared listener, newest-active-first. */
export function useCounselorInbox() {
  const [threads, setThreads] = useState<CounselorThread[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    return counselorBridge.subscribeInbox((list) => {
      setThreads(list)
      setLoaded(true)
    })
  }, [])

  const unreadCount = threads.filter((t) => t.unreadForAdmin).length

  return { threads, unreadCount, loaded }
}
