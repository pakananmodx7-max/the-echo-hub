import type { AwardResult } from './rewardsService'
import { BADGES, getLevelTitle, getNewlyUnlockedBadges, type BadgeDef } from './levelConfig'

/**
 * A tiny module-level pub/sub, not React state — mirrors the pattern already used elsewhere
 * in this app for globally-mounted singletons (e.g. IncomingChatRequestModal,
 * NewMessageToast) that react to events fired from anywhere without prop-drilling. The only
 * subscriber in practice is RewardPopupHost.tsx, mounted once in HubLayout.
 */
export type RewardPopupEvent =
  | { kind: 'reward'; points: number; icon: string; label: string }
  | { kind: 'levelup'; fromLevel: number; toLevel: number; multiJump: boolean; emoji: string; title: string }
  | { kind: 'milestone'; badge: BadgeDef }

type Listener = (event: RewardPopupEvent) => void

const listeners = new Set<Listener>()

export function subscribeRewardPopups(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(event: RewardPopupEvent): void {
  for (const listener of listeners) listener(event)
}

export interface ActivityDisplayMeta {
  icon: string
  label: string
}

/**
 * The one place every activity page calls after awaiting/receiving an AwardResult — decides
 * whether to show a reward toast, then a level-up celebration, then a milestone badge
 * celebration, in that order (spec §8/§9), using ONLY the confirmed server-derived result
 * (spec §6: never for `granted: false`, whatever the reason). `activity` supplies the
 * toast's icon/label — deliberately a caller-supplied value rather than derived solely from
 * the MissionId, since some activities intentionally share one mission/reward type (Friend
 * Quest and Who Am I? both use 'friendbond'; ECHO Journal and Draw & Listen both use
 * 'journal') but must still show their own distinct name in the toast (spec §7's own
 * examples list "Friend Bond" and "Who Am I?" as separate lines) — this never changes the
 * underlying reward/ledger semantics, only which label this specific call displays.
 */
export function notifyRewardResult(result: AwardResult, activity: ActivityDisplayMeta): void {
  if (!result.granted || typeof result.points !== 'number') return

  emit({ kind: 'reward', points: result.points, icon: activity.icon, label: activity.label })

  if (result.leveledUp && typeof result.previousLevel === 'number' && typeof result.currentLevel === 'number') {
    const { emoji, title } = getLevelTitle(result.currentLevel)
    emit({
      kind: 'levelup',
      fromLevel: result.previousLevel,
      toLevel: result.currentLevel,
      multiJump: result.currentLevel - result.previousLevel > 1,
      emoji,
      title,
    })

    // Spec §16: on a multi-level jump, show only the HIGHEST newly unlocked milestone badge
    // — never one popup per skipped level. unlockedBadges on the result already carries the
    // right ids, but badge objects (with their celebration copy) live in levelConfig, so
    // re-derive the same crossed set here to pick the highest one.
    const crossed = getNewlyUnlockedBadges(result.previousLevel, result.currentLevel)
    const highest = crossed.at(-1)
    if (highest) emit({ kind: 'milestone', badge: highest })
  }
}

/** Exposed for tests / callers that already have a badge id (e.g. from AwardResult.unlockedBadges) and want the full BadgeDef. */
export function getBadgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id)
}
