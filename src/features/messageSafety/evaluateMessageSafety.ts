import { normalizeMessage, normalizeTermForCompactMatch } from './normalizeMessage'
import {
  CONTEXTUAL_PATTERN_RULES,
  EXACT_TERM_RULES,
  PHRASE_PATTERN_RULES,
  SAFE_EXCEPTIONS,
  SEVERITY_RANK,
  type SafetyCategory,
  type SafetySeverity,
} from './messageSafetyRules'
import { getMessageSafetySuggestion } from './messageSafetySuggestions'

export interface MessageSafetyResult {
  allowed: boolean
  severity: SafetySeverity
  category?: SafetyCategory
  matchedRuleId?: string
  /** A gentle rule-based rewrite the student can optionally use — only set when blocked. */
  suggestion?: string
}

/** The small fixed vocabulary from the spec's privacy requirement — never the category id
 * (too granular/leaky) and never the raw message, just enough to spot trends in logs. */
const DIAGNOSTIC_LABELS: Record<SafetyCategory, string> = {
  profanity_general: 'blocked_profanity',
  insult_direct: 'blocked_profanity',
  insult_ability: 'blocked_degrading',
  insult_appearance: 'blocked_degrading',
  degrading: 'blocked_degrading',
  exclusion: 'blocked_degrading',
  sarcasm_pressure: 'blocked_degrading',
  intimidation: 'blocked_threat',
  harassment: 'blocked_harassment',
  threat_violence: 'blocked_threat',
  self_harm_encouragement: 'blocked_self_harm_encouragement',
  wish_death_or_gone: 'blocked_self_harm_encouragement',
  discrimination: 'blocked_hate',
  sexual_harassment: 'blocked_sexual_harassment',
}

interface RuleMatch {
  severity: SafetySeverity
  category: SafetyCategory
  ruleId: string
}

const MASK_CHAR = '#'

/** Replaces every occurrence of each safe-exception term with placeholder characters of
 * the same length, so a rule can never match inside a known-harmless word/phrase (e.g.
 * "หีบ" masks out before the "หี" exact-term check ever runs). Length-preserving so it
 * never shifts other matches' positions. */
function maskSafeExceptions(text: string, exceptionTerms: string[]): string {
  let masked = text
  for (const term of exceptionTerms) {
    if (!term) continue
    let idx = masked.indexOf(term)
    while (idx !== -1) {
      masked = masked.slice(0, idx) + MASK_CHAR.repeat(term.length) + masked.slice(idx + term.length)
      idx = masked.indexOf(term, idx + term.length)
    }
  }
  return masked
}

function logBlocked(category: SafetyCategory) {
  // Category only — see DIAGNOSTIC_LABELS above. Never logs message content.
  console.info(`[messageSafety] ${DIAGNOSTIC_LABELS[category]}`)
}

/**
 * The one shared safety validator for every social text input in THE ECHO HUB (Private
 * Chat, Garden World Chat, and anywhere else user-to-user text is sent). Pure, synchronous,
 * local-only — no network call, safe to run on every Send press.
 *
 * Never mutates or reveals the input; callers are responsible for keeping the original
 * text in their own composer state so the student can edit and resend.
 */
export function evaluateMessageSafety(text: string): MessageSafetyResult {
  if (!text || !text.trim()) return { allowed: true, severity: 'safe' }

  const { standard, compact } = normalizeMessage(text)

  const compactExceptionTerms = SAFE_EXCEPTIONS.map((e) => normalizeTermForCompactMatch(e.term))
  const standardExceptionTerms = SAFE_EXCEPTIONS.map((e) => normalizeMessage(e.term).standard)

  const maskedCompact = maskSafeExceptions(compact, compactExceptionTerms)
  const maskedStandard = maskSafeExceptions(standard, standardExceptionTerms)

  const matches: RuleMatch[] = []

  for (const rule of EXACT_TERM_RULES) {
    for (const term of rule.terms) {
      const compactTerm = normalizeTermForCompactMatch(term)
      if (compactTerm && maskedCompact.includes(compactTerm)) {
        matches.push({ severity: rule.severity, category: rule.category, ruleId: rule.id })
        break
      }
    }
  }

  for (const rule of PHRASE_PATTERN_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(maskedStandard)) {
        matches.push({ severity: rule.severity, category: rule.category, ruleId: rule.id })
        break
      }
    }
  }

  for (const rule of CONTEXTUAL_PATTERN_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(maskedStandard)) {
        matches.push({ severity: rule.severity, category: rule.category, ruleId: rule.id })
        break
      }
    }
  }

  if (matches.length === 0) return { allowed: true, severity: 'safe' }

  const worst = matches.reduce((worstSoFar, candidate) =>
    SEVERITY_RANK[candidate.severity] > SEVERITY_RANK[worstSoFar.severity] ? candidate : worstSoFar,
  )

  const allowed = worst.severity === 'safe' || worst.severity === 'warning'
  if (!allowed) logBlocked(worst.category)

  return {
    allowed,
    severity: worst.severity,
    category: worst.category,
    matchedRuleId: worst.ruleId,
    suggestion: allowed ? undefined : getMessageSafetySuggestion(worst.category),
  }
}
