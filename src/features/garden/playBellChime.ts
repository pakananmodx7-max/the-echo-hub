/**
 * A short, gentle synthesized bell chime for the Mindfulness Bell — Web Audio oscillators
 * with a soft exponential decay, not an audio file (no new binary asset, nothing to
 * preload). Deliberately a single plain tone, never looping/chanting audio (spec §13:
 * "Do NOT autoplay chanting/religious audio" — this only ever plays once, on tap).
 */
export function playBellChime(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    // Two slightly-detuned partials (a fundamental + a soft overtone) read as a bell
    // rather than a plain beep, still just two oscillators — negligible cost.
    const partials: [number, number][] = [
      [432, 0.5],
      [648, 0.22],
    ]
    for (const [freq, gainPeak] of partials) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(gainPeak, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.6)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 2.7)
    }
    window.setTimeout(() => void ctx.close(), 3000)
  } catch {
    // Best-effort only — a blocked/unsupported AudioContext must never break the bell's
    // actual function (showing today's reflection + granting the reward).
  }
}
