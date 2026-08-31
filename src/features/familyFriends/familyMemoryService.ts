import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore'
import { firebaseConfigured, getFirebaseFirestore } from '../../lib/firebase'

/**
 * Private personal memory-timeline entry: users/{uid}/familyMemories/{memoryId}. Owner-only,
 * same private-by-default guarantee as Daily Journal and Open Heart answers — never
 * published to ECHO Space, Garden, or any public profile. Unlike Daily Journal, the doc id
 * is a random auto-id (not the memory's own `date`), since a person may want to save more
 * than one memory for the same day.
 */
export interface FamilyMemoryEntry {
  id: string
  date: string
  title: string
  description: string
  emoji: string
  tag: string
  createdAt: number | null
  updatedAt: number | null
}

export interface FamilyMemoryDraft {
  date: string
  title: string
  description: string
  emoji: string
  tag: string
}

function toMillis(value: unknown): number | null {
  const ts = value as Timestamp | undefined
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null
}

function toEntry(id: string, data: DocumentData): FamilyMemoryEntry {
  return {
    id,
    date: typeof data.date === 'string' ? data.date : '',
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    emoji: typeof data.emoji === 'string' ? data.emoji : '',
    tag: typeof data.tag === 'string' ? data.tag : '',
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  }
}

function collectionRef(uid: string) {
  return collection(getFirebaseFirestore(), 'users', uid, 'familyMemories')
}

/** One shared subscription to the whole collection, newest memory date first — this is a
 * personal collection expected to stay small (a few memories at a time), matching how this
 * app already subscribes to other small per-account collections in full rather than paging. */
export function subscribeFamilyMemories(uid: string, callback: (entries: FamilyMemoryEntry[]) => void): () => void {
  if (!firebaseConfigured) {
    callback([])
    return () => {}
  }
  const q = query(collectionRef(uid), orderBy('date', 'desc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => toEntry(d.id, d.data()))),
    (err) => console.error('[familyMemory] subscribeFamilyMemories failed', err),
  )
}

export interface FamilyMemoryWriteResult {
  ok: boolean
  id?: string
}

export async function createFamilyMemory(uid: string, draft: FamilyMemoryDraft): Promise<FamilyMemoryWriteResult> {
  if (!firebaseConfigured) return { ok: false }
  try {
    const ref = doc(collectionRef(uid))
    await setDoc(ref, {
      date: draft.date,
      title: draft.title,
      description: draft.description,
      emoji: draft.emoji,
      tag: draft.tag,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { ok: true, id: ref.id }
  } catch (err) {
    console.error('[familyMemory] createFamilyMemory failed', err)
    return { ok: false }
  }
}

export async function updateFamilyMemory(uid: string, id: string, draft: FamilyMemoryDraft): Promise<FamilyMemoryWriteResult> {
  if (!firebaseConfigured) return { ok: false }
  try {
    await setDoc(
      doc(collectionRef(uid), id),
      {
        date: draft.date,
        title: draft.title,
        description: draft.description,
        emoji: draft.emoji,
        tag: draft.tag,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    return { ok: true, id }
  } catch (err) {
    console.error('[familyMemory] updateFamilyMemory failed', err)
    return { ok: false }
  }
}

export async function deleteFamilyMemory(uid: string, id: string): Promise<FamilyMemoryWriteResult> {
  if (!firebaseConfigured) return { ok: false }
  try {
    await deleteDoc(doc(collectionRef(uid), id))
    return { ok: true, id }
  } catch (err) {
    console.error('[familyMemory] deleteFamilyMemory failed', err)
    return { ok: false }
  }
}
