import { useEffect, useMemo, useState } from 'react'
import { counselorBridge, type CounselorMessage, type CounselorThread } from '../features/counselor/counselorBridge'
import { useAuth } from './useAuth'

/** Admin-side: live view of ONE student's thread + messages, and the reply action. Mirrors
 * useCounselorThread's own live/older message split — see that hook for why they're kept
 * separate rather than merged into one array. */
export function useCounselorThreadAdmin(studentUid: string | undefined) {
  const { user } = useAuth()
  const [thread, setThread] = useState<CounselorThread | null>(null)
  const [liveMessages, setLiveMessages] = useState<CounselorMessage[]>([])
  const [olderMessages, setOlderMessages] = useState<CounselorMessage[]>([])
  const [studentReadAtMs, setStudentReadAtMs] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)

  const messages = useMemo(() => [...olderMessages, ...liveMessages], [olderMessages, liveMessages])

  useEffect(() => {
    if (!studentUid) {
      setThread(null)
      return
    }
    return counselorBridge.subscribeMyThread(studentUid, setThread)
  }, [studentUid])

  useEffect(() => {
    setOlderMessages([])
    if (!studentUid) {
      setLiveMessages([])
      return
    }
    return counselorBridge.subscribeRecentMessages(studentUid, (recent) => {
      setLiveMessages(recent)
      setHasMoreHistory(recent.length >= 50)
    })
  }, [studentUid])

  useEffect(() => {
    if (!studentUid) {
      setStudentReadAtMs(null)
      return
    }
    return counselorBridge.subscribeReadState(studentUid, 'student', setStudentReadAtMs)
  }, [studentUid])

  useEffect(() => {
    if (!studentUid || !thread) return
    void counselorBridge.markThreadOpened(studentUid, 'admin')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentUid, !!thread])

  async function reply(text: string) {
    if (!studentUid || !user?.id || !user.publicId) return
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    try {
      await counselorBridge.sendAdminReply(studentUid, user.id, user.publicId, trimmed)
    } finally {
      setSending(false)
    }
  }

  async function loadOlder() {
    if (!studentUid || loadingOlder || !hasMoreHistory) return
    const oldest = (olderMessages[0] ?? liveMessages[0]) as CounselorMessage | undefined
    if (!oldest || oldest.createdAtMs == null) return
    setLoadingOlder(true)
    try {
      const { messages: older, hasMore } = await counselorBridge.loadOlderMessages(studentUid, oldest.createdAtMs)
      setOlderMessages((prev) => [...older, ...prev])
      setHasMoreHistory(hasMore)
    } finally {
      setLoadingOlder(false)
    }
  }

  return { thread, messages, studentReadAtMs, reply, sending, loadOlder, loadingOlder, hasMoreHistory }
}
