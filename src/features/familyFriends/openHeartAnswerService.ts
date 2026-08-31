import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type DocumentData, type Timestamp } from 'firebase/firestore'
import { firebaseConfigured, getFirebaseFirestore } from '../../lib/firebase'

/**
 * Private, per-account, per-Bangkok-calendar-day answer to that day's Open Heart Question:
 * users/{uid}/openHeartAnswers/{date}. Owner-only, exactly like Daily Journal — never keyed
 * by publicId, never readable by anyone else. Only written when the student chooses "ตอบของฉัน"
 * (answer in-app); choosing "เอาไปคุยกับใครสักคน" instead completes the mission without ever
 * creating one of these documents (see OpenHeartQuestionPage.tsx).
 */
export interface OpenHeartAnswerEntry {
  date: string
  questionId: string
  questionText: string
  answer: string
  createdAt: number | null
  updatedAt: number | null
}

export interface OpenHeartAnswerDraft {
  questionId: string
  questionText: string
  answer: string
}

function toMillis(value: unknown): number | null {
  const ts = value as Timestamp | undefined
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null
}

function toEntry(date: string, data: DocumentData | undefined): OpenHeartAnswerEntry | null {
  if (!data) return null
  return {
    date,
    questionId: typeof data.questionId === 'string' ? data.questionId : '',
    questionText: typeof data.questionText === 'string' ? data.questionText : '',
    answer: typeof data.answer === 'string' ? data.answer : '',
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  }
}

function entryRef(uid: string, date: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'openHeartAnswers', date)
}

export async function fetchOpenHeartAnswer(uid: string, date: string): Promise<OpenHeartAnswerEntry | null> {
  if (!firebaseConfigured) return null
  const snap = await getDoc(entryRef(uid, date))
  return toEntry(date, snap.data())
}

export function subscribeOpenHeartAnswer(
  uid: string,
  date: string,
  callback: (entry: OpenHeartAnswerEntry | null) => void,
): () => void {
  if (!firebaseConfigured) {
    callback(null)
    return () => {}
  }
  return onSnapshot(
    entryRef(uid, date),
    (snap) => callback(toEntry(date, snap.data())),
    (err) => console.error('[openHeartAnswer] subscribeOpenHeartAnswer failed', err),
  )
}

export interface SaveOpenHeartAnswerResult {
  ok: boolean
}

/** Same isNewEntry contract as dailyJournalService.saveJournalEntry — see there for why. */
export async function saveOpenHeartAnswer(
  uid: string,
  date: string,
  draft: OpenHeartAnswerDraft,
  isNewEntry: boolean,
): Promise<SaveOpenHeartAnswerResult> {
  if (!firebaseConfigured) return { ok: false }
  try {
    const patch: DocumentData = {
      date,
      questionId: draft.questionId,
      questionText: draft.questionText,
      answer: draft.answer,
      updatedAt: serverTimestamp(),
    }
    if (isNewEntry) patch.createdAt = serverTimestamp()
    await setDoc(entryRef(uid, date), patch, { merge: true })
    return { ok: true }
  } catch (err) {
    console.error('[openHeartAnswer] saveOpenHeartAnswer failed', { date, message: err instanceof Error ? err.message : String(err) })
    return { ok: false }
  }
}
