type Listener<T> = (value: T) => void

interface SharedEntry<T> {
  value: T
  listeners: Set<Listener<T>>
  unsubscribe: () => void
}

/**
 * Several components often need the exact same live Firestore/RTDB query at the same
 * time — a globally-mounted watcher/banner (SentRequestWatcher, NewMessageToast,
 * ActiveChatReminderBanner) plus whichever page is currently showing the same data
 * (Echo Space, the Notification Center, the pending-requests review page). Without this,
 * each consumer opens its own fully redundant listener against the identical query.
 *
 * `createSharedSubscription` wraps a raw subscribe function so that, per key (e.g. a
 * publicId), only ONE real listener is ever open — reference-counted across every local
 * consumer — and torn down the moment the last one unmounts.
 */
export function createSharedSubscription<T>(
  subscribe: (key: string, callback: (value: T) => void) => () => void,
  initialValue: T,
) {
  const active = new Map<string, SharedEntry<T>>()

  return function subscribeShared(key: string, listener: Listener<T>): () => void {
    let entry = active.get(key)
    if (!entry) {
      const created: SharedEntry<T> = { value: initialValue, listeners: new Set(), unsubscribe: () => {} }
      created.unsubscribe = subscribe(key, (value) => {
        created.value = value
        for (const l of created.listeners) l(value)
      })
      active.set(key, created)
      entry = created
    }
    entry.listeners.add(listener)
    listener(entry.value)
    return () => {
      entry!.listeners.delete(listener)
      if (entry!.listeners.size === 0) {
        entry!.unsubscribe()
        active.delete(key)
      }
    }
  }
}
