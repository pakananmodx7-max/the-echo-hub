/**
 * Tiny localStorage-backed pub-sub list store shared by the ECHO GARDEN mock
 * services (public chat, Song Tree, Kind Word Garden). Every key lives under
 * the `echoHub.garden.mock.*` prefix so it is unambiguously demo data, kept
 * separate from real app data (auth, journal, ...). This is the seam a real
 * backend (Firestore `onSnapshot`, for instance) would replace — components
 * only ever see `list()` / `add()` / `subscribe()`, never localStorage.
 */
export function createLocalGardenStore<T extends { id: string; createdAt: string }>(
  storageKey: string,
  seed: T[],
) {
  const fullKey = `echoHub.garden.mock.${storageKey}`
  const listeners = new Set<(items: T[]) => void>()

  function read(): T[] {
    try {
      const raw = localStorage.getItem(fullKey)
      if (!raw) return seed
      return JSON.parse(raw) as T[]
    } catch {
      return seed
    }
  }

  function write(items: T[]) {
    localStorage.setItem(fullKey, JSON.stringify(items))
    for (const listener of listeners) listener(items)
  }

  return {
    list(): T[] {
      return read().sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },
    add(item: T) {
      const items = [...read(), item]
      write(items)
      return item
    },
    update(id: string, patch: Partial<T>) {
      const items = read().map((item) => (item.id === id ? { ...item, ...patch } : item))
      write(items)
    },
    subscribe(callback: (items: T[]) => void): () => void {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
  }
}
