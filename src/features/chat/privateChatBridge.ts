export interface ChatRequestTarget {
  id: string
  codename: string
}

/**
 * The single entry point for "ask to talk privately" anywhere in the app —
 * ECHO SPACE, ECHO GARDEN's avatar interactions, the Private Bench, and the
 * online member panel all call this instead of each rolling their own send
 * logic. Interface-first so a `FirebaseChatBridge` (real chat-request
 * documents + acceptance flow + the actual Private Chat thread) can replace
 * `MockPrivateChatBridge` later without touching any UI component.
 *
 * In mock mode there is no other real device to accept the request, so this
 * intentionally stops at "request sent" — it never fabricates an acceptance
 * or opens a fake chat thread.
 */
export interface PrivateChatBridge {
  sendRequest(target: ChatRequestTarget): Promise<void>
}

class MockPrivateChatBridge implements PrivateChatBridge {
  async sendRequest(_target: ChatRequestTarget): Promise<void> {
    // Simulate a brief network round-trip; no data leaves the device.
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

export const privateChatBridge: PrivateChatBridge = new MockPrivateChatBridge()
