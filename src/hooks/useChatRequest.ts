import { useState } from 'react'
import { privateChatBridge, type ChatRequestTarget } from '../features/chat/privateChatBridge'

export function useChatRequest() {
  const [target, setTarget] = useState<ChatRequestTarget | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  function request(user: ChatRequestTarget) {
    setTarget(user)
  }

  function cancel() {
    setTarget(null)
  }

  async function confirm() {
    if (!target) return
    setSending(true)
    try {
      await privateChatBridge.sendRequest(target)
      setSentIds((prev) => new Set(prev).add(target.id))
    } finally {
      setSending(false)
    }
  }

  function alreadySentTo(id: string) {
    return sentIds.has(id)
  }

  return {
    target,
    request,
    cancel,
    confirm,
    sending,
    alreadySentTo,
    isTargetSent: target ? sentIds.has(target.id) : false,
  }
}

export type UseChatRequest = ReturnType<typeof useChatRequest>
