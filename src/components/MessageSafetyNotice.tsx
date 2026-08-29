interface MessageSafetyNoticeProps {
  severity: 'blocked' | 'critical'
  suggestion?: string
  onUseSuggestion?: () => void
  /** 'chat' uses PrivateChatPage's CSS custom properties (dark-mode aware); 'plain' uses
   * THE ECHO HUB's normal lavender/cream Tailwind palette (Garden World Chat, always light). */
  variant?: 'chat' | 'plain'
}

const BLOCKED_COPY =
  'ข้อความนี้อาจมีคำหรือถ้อยคำที่ทำร้ายความรู้สึกของผู้อื่น 💜\nลองปรับคำพูดให้อ่อนโยนและเคารพกันมากขึ้นก่อนส่งนะ\n\nกรุณาแก้ไขข้อความก่อนส่ง'
const CRITICAL_COPY = 'ข้อความนี้มีถ้อยคำที่อาจทำร้ายหรือคุกคามอีกฝ่าย\nกรุณาปรับข้อความก่อนส่ง'

/**
 * The gentle, non-punitive inline notice shown when evaluateMessageSafety() blocks a
 * draft — never a modal (per spec, "prefer inline feedback"), never labels the internal
 * severity/category to the student, and never touches the composer's text itself. Reused
 * by both Private Chat and Garden World Chat so the wording stays in exactly one place.
 */
export function MessageSafetyNotice({ severity, suggestion, onUseSuggestion, variant = 'plain' }: MessageSafetyNoticeProps) {
  const isCritical = severity === 'critical'

  const containerStyle =
    variant === 'chat'
      ? { background: isCritical ? 'var(--chat-danger-bg)' : 'var(--chat-system-bg)', color: isCritical ? 'var(--chat-danger-text)' : 'var(--chat-system-text)' }
      : undefined
  const containerClass =
    variant === 'chat'
      ? 'rounded-2xl px-4 py-3 text-sm leading-relaxed'
      : `rounded-2xl px-4 py-3 text-sm leading-relaxed ${isCritical ? 'bg-pink-glow text-pink-text' : 'bg-lavender-50 text-ink-soft'}`

  const suggestionBoxStyle = variant === 'chat' ? { background: 'var(--chat-bubble-in-bg)', color: 'var(--chat-text)' } : undefined
  const suggestionBoxClass = variant === 'chat' ? 'mt-1 rounded-xl px-3 py-2 text-sm' : 'mt-1 rounded-xl bg-white px-3 py-2 text-sm text-ink'

  return (
    <div className={containerClass} style={containerStyle} role="status">
      <p className="whitespace-pre-line">{isCritical ? CRITICAL_COPY : BLOCKED_COPY}</p>
      {suggestion ? (
        <div className="mt-2.5">
          <p className="text-xs font-medium opacity-80">ลองพูดแบบนี้ดูไหม:</p>
          <p className={suggestionBoxClass} style={suggestionBoxStyle}>
            {suggestion}
          </p>
          {onUseSuggestion ? (
            <button type="button" onClick={onUseSuggestion} className="mt-2 text-xs font-semibold underline underline-offset-2">
              ใช้ข้อความนี้แทน
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
