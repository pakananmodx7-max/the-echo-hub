/**
 * Lightweight pub-sub so BottomNav can ask "is it okay to leave right now?" without
 * coupling it to PrivateChatPage directly. PrivateChatPage registers a confirmer only
 * while it's mounted AND the room is still active; everywhere else this is a no-op that
 * always allows navigation immediately. Never blocks leaving — only offers a choice.
 */
type Confirmer = () => Promise<boolean>

let activeConfirmer: Confirmer | null = null

export function registerActiveChatGuard(confirmer: Confirmer): () => void {
  activeConfirmer = confirmer
  return () => {
    if (activeConfirmer === confirmer) activeConfirmer = null
  }
}

export async function confirmLeavingActiveChat(): Promise<boolean> {
  if (!activeConfirmer) return true
  return activeConfirmer()
}
