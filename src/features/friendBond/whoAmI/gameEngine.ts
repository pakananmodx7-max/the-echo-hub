import type { PlayerScore, TeamInfo } from './types'

export function makePlayers(names: string[]): PlayerScore[] {
  return names.map((name, i) => ({ id: `player-${i}`, name, correct: 0, skipped: 0, hintsUsed: 0 }))
}

export function defaultPlayerName(index: number): string {
  return `ผู้เล่น ${index + 1}`
}

/** Round-robin turn order across two teams so every member gets a turn before repeats. */
export function buildTeamTurnOrder(teams: TeamInfo[]): { teamId: string; playerId: string }[] {
  const order: { teamId: string; playerId: string }[] = []
  const maxLen = Math.max(...teams.map((t) => t.playerIds.length), 0)
  for (let round = 0; round < maxLen; round++) {
    for (const team of teams) {
      const playerId = team.playerIds[round % team.playerIds.length]
      if (playerId !== undefined) order.push({ teamId: team.id, playerId })
    }
  }
  return order
}

export function teamScore(team: TeamInfo, scores: Record<string, PlayerScore>): number {
  return team.playerIds.reduce((sum, id) => sum + (scores[id]?.correct ?? 0), 0)
}

export function sortByScoreDesc(players: PlayerScore[]): PlayerScore[] {
  return [...players].sort((a, b) => b.correct - a.correct)
}
