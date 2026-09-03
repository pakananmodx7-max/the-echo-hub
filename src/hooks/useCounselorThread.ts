import { useEffect, useMemo, useState } from 'react'
import { counselorBridge, type CounselorMessage, type CounselorThread } from '../features/counselor/counselorBridge'
import { useAuth } from './useAuth'

/** Student-side: live view of the caller's own persistent counselor thread + its most
 * recent messages, plus send/loadOlder/markOpened actions. There is exactly one thread per
 * student (keyed by their own uid), so this hook needs no id parameter at all. */
export function useCounselorThread() {
  const { user } = useAuth()
  const [thread, setThread] = useState<CounselorThread | null>(null)
  // Kept as two separate pieces of state on purpose: `liveMessages` always mirrors the
  // realtime "latest 50" subscription (see counselorBridge.subscribeRecentMessages) and gets
  // fully replaced on every tick, while `olderMessages` only ever grows via loadOlder()'s
  // one-shot fetches. Merging pagination straight into the live-subscribed array would lose
  // every "load previous" page the instant the next realtime update replaced it.
  const [liveMessages, setLiveMessages] = useState<CounselorMessage[]>([])
  const [olderMessages, setOlderMessages] = useState<CounselorMessage[]>([])
  const [adminReadAtMs, setAdminReadAtMs] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)

  const studentUid = user?.id ?? null
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
      // A full page of 50 came back, so there may be older history beyond it.
      setHasMoreHistory(recent.length >= 50)
    })
  }, [studentUid])

  useEffect(() => {
    if (!studentUid) {
      setAdminReadAtMs(null)
      return
    }
    return counselorBridge.subscribeReadState(studentUid, 'admin', setAdminReadAtMs)
  }, [studentUid])

  // Marks the thread opened (clears the "unread reply" flag + updates the student's own
  // read cursor) once, whenever the page mounts with a real thread present.
  useEffect(() => {
    if (!studentUid || !thread) return
    void counselorBridge.markThreadOpened(studentUid, 'student')
    // Deliberately re-runs only when the thread itself first appears (created by the first
    // message) or the student navigates back in — not on every message tick, which would
    // otherwise re-write the read cursor on every single incoming admin message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentUid, !!thread])

  async function send(text: string) {
    if (!studentUid || !user?.publicId || !user.codename) return
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    try {
      await counselorBridge.sendStudentMessage(studentUid, user.publicId, user.codename, trimmed)
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

  return { thread, messages, adminReadAtMs, send, sending, loadOlder, loadingOlder, hasMoreHistory }
}
