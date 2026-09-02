import { describe, expect, it } from 'vitest'
import { GARDEN_WORLD_CHAT_ENABLED } from './gardenFeatureFlags'

describe('GARDEN_WORLD_CHAT_ENABLED', () => {
  it('is a boolean', () => {
    expect(typeof GARDEN_WORLD_CHAT_ENABLED).toBe('boolean')
  })

  it('defaults to disabled in this environment (World Chat is temporarily paused)', () => {
    // .env sets VITE_ENABLE_GARDEN_WORLD_CHAT=false right now (see .env.example for the
    // documented default) — this pins the "temporarily disabled" intent as a real
    // assertion rather than just a comment, so a future accidental flip back to enabled
    // (or an accidental deletion of the line) fails a test instead of shipping silently.
    expect(GARDEN_WORLD_CHAT_ENABLED).toBe(false)
  })
})
