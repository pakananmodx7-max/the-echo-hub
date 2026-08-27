import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../../../components/PageHeader'
import { useAuth } from '../../../../hooks/useAuth'
import { ModeSelectStep } from './steps/ModeSelectStep'
import { PlayerCountStep } from './steps/PlayerCountStep'
import { PlayerNamesStep } from './steps/PlayerNamesStep'
import { TeamAssignStep } from './steps/TeamAssignStep'
import { CategorySelectStep } from './steps/CategorySelectStep'
import { DifficultyStep } from './steps/DifficultyStep'
import { TimerStep } from './steps/TimerStep'
import { HowToPlayStep } from './steps/HowToPlayStep'
import { MotionCalibrationStep } from './steps/MotionCalibrationStep'
import { HandoffStep } from './steps/HandoffStep'
import { PlayScreen } from './steps/PlayScreen'
import { RoundSummaryStep } from './steps/RoundSummaryStep'
import { ScoreboardStep } from './steps/ScoreboardStep'
import { TeamSummaryStep } from './steps/TeamSummaryStep'
import { SoloSummaryStep } from './steps/SoloSummaryStep'
import { CATEGORY_GROUPS, entriesForSubcategoryIds } from '../../../../features/friendBond/whoAmI/data'
import { SessionDeck, filterByDifficulty } from '../../../../features/friendBond/whoAmI/sessionDeck'
import { buildTeamTurnOrder, makePlayers, teamScore } from '../../../../features/friendBond/whoAmI/gameEngine'
import { motionApiAvailable } from '../../../../features/friendBond/whoAmI/useMotionGestures'
import type {
  ControlMode,
  DifficultyFilter,
  MusicGuessMode,
  PlayerScore,
  RoundResult,
  TeamInfo,
  TimerOption,
  WhoAmIGameMode,
} from '../../../../features/friendBond/whoAmI/types'

type Phase =
  | 'mode'
  | 'player-count'
  | 'player-names'
  | 'team-assign'
  | 'category'
  | 'difficulty'
  | 'timer'
  | 'how-to-play'
  | 'motion-setup'
  | 'handoff'
  | 'play'
  | 'round-summary'
  | 'scoreboard'
  | 'team-summary'
  | 'solo-summary'

const HOW_TO_PLAY_SEEN_KEY = 'echoHub.demo.whoAmISeenHowTo'

function categoryLabelFor(selected: string[]): string {
  const labels: string[] = []
  for (const group of CATEGORY_GROUPS) {
    for (const sub of group.subcategories) {
      if (selected.includes(sub.id)) labels.push(sub.label)
    }
  }
  if (labels.length === 0) return ''
  if (labels.length <= 2) return labels.join(' · ')
  return `${labels[0]} +${labels.length - 1} หมวด`
}

export function WhoAmIGamePage() {
  const navigate = useNavigate()
  const { completeActivity } = useAuth()

  const [phase, setPhase] = useState<Phase>('mode')
  const [mode, setMode] = useState<WhoAmIGameMode>('solo')

  const [playerCount, setPlayerCount] = useState(2)
  const [playerNames, setPlayerNames] = useState<string[]>([])

  const [teamAName, setTeamAName] = useState('ทีม A')
  const [teamBName, setTeamBName] = useState('ทีม B')
  const [teamAIndices, setTeamAIndices] = useState<number[]>([])
  const [teamBIndices, setTeamBIndices] = useState<number[]>([])

  const [selectedSubcats, setSelectedSubcats] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('mixed')
  const [timerSeconds, setTimerSeconds] = useState<TimerOption>(60)
  const [musicMode, setMusicMode] = useState<MusicGuessMode>('title')

  const [controlMode, setControlMode] = useState<ControlMode | null>(null)

  const [deck, setDeck] = useState<SessionDeck | null>(null)
  const [players, setPlayers] = useState<PlayerScore[]>([])
  const [turnOrder, setTurnOrder] = useState<{ playerId: string; teamId?: string }[]>([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [lastResult, setLastResult] = useState<RoundResult | null>(null)

  function buildDeck(): SessionDeck {
    const pool = entriesForSubcategoryIds(selectedSubcats)
    const filtered = filterByDifficulty(pool, difficulty)
    return new SessionDeck(filtered.length > 0 ? filtered : pool, musicMode)
  }

  function startGameFlow() {
    const newDeck = buildDeck()
    setDeck(newDeck)

    if (mode === 'solo') {
      setPhase('play')
      return
    }

    if (mode === 'multiplayer') {
      const p = makePlayers(playerNames.map((n, i) => n.trim() || `ผู้เล่น ${i + 1}`))
      setPlayers(p)
      setTurnOrder(p.map((pl) => ({ playerId: pl.id })))
      setTurnIndex(0)
      setPhase('handoff')
      return
    }

    // team
    const p = makePlayers(playerNames.map((n, i) => n.trim() || `ผู้เล่น ${i + 1}`))
    setPlayers(p)
    const teams: TeamInfo[] = [
      { id: 'A', name: teamAName, playerIds: teamAIndices.map((i) => `player-${i}`) },
      { id: 'B', name: teamBName, playerIds: teamBIndices.map((i) => `player-${i}`) },
    ]
    setTurnOrder(buildTeamTurnOrder(teams))
    setTurnIndex(0)
    setPhase('handoff')
  }

  function proceedAfterTimer() {
    const seen = typeof window !== 'undefined' && localStorage.getItem(HOW_TO_PLAY_SEEN_KEY) === 'true'
    if (!seen) {
      setPhase('how-to-play')
    } else {
      proceedToMotionSetup()
    }
  }

  function handleHowToPlayReady() {
    try {
      localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, 'true')
    } catch {
      // ignore storage errors
    }
    proceedToMotionSetup()
  }

  function proceedToMotionSetup() {
    if (controlMode) {
      startGameFlow()
      return
    }
    if (!motionApiAvailable()) {
      setControlMode('buttons')
      startGameFlow()
      return
    }
    setPhase('motion-setup')
  }

  function handleMotionSetupDone(mode: ControlMode) {
    setControlMode(mode)
    startGameFlow()
  }

  function currentTurnPlayer(): PlayerScore | undefined {
    const entry = turnOrder[turnIndex]
    if (!entry) return undefined
    return players.find((p) => p.id === entry.playerId)
  }

  function currentTeamLabel(): string | undefined {
    const entry = turnOrder[turnIndex]
    if (!entry?.teamId) return undefined
    return entry.teamId === 'A' ? `🔵 ${teamAName}` : `🟣 ${teamBName}`
  }

  function handleRoundEnd(result: RoundResult) {
    if (mode === 'solo') {
      setLastResult(result)
      setPhase('solo-summary')
      void completeActivity('friend-bond')
      return
    }

    const entry = turnOrder[turnIndex]
    if (entry) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === entry.playerId
            ? { ...p, correct: p.correct + result.correct, skipped: p.skipped + result.skipped, hintsUsed: p.hintsUsed + result.hintsUsed }
            : p,
        ),
      )
    }
    setLastResult(result)
    setPhase('round-summary')
  }

  function handleRoundSummaryContinue() {
    const isLast = turnIndex + 1 >= turnOrder.length
    if (isLast) {
      void completeActivity('friend-bond')
      setPhase(mode === 'team' ? 'team-summary' : 'scoreboard')
      return
    }
    setTurnIndex((i) => i + 1)
    setPhase('handoff')
  }

  function resetToCategoryChange() {
    setSelectedSubcats([])
    setPhase('category')
  }

  function playAgainSameConfig() {
    setPlayers((prev) => prev.map((p) => ({ ...p, correct: 0, skipped: 0, hintsUsed: 0 })))
    startGameFlow()
  }

  const currentPlayer = currentTurnPlayer()
  const teamAScore = teamScore({ id: 'A', name: teamAName, playerIds: teamAIndices.map((i) => `player-${i}`) }, Object.fromEntries(players.map((p) => [p.id, p])))
  const teamBScore = teamScore({ id: 'B', name: teamBName, playerIds: teamBIndices.map((i) => `player-${i}`) }, Object.fromEntries(players.map((p) => [p.id, p])))

  const showChrome = phase !== 'handoff' && phase !== 'play'

  return (
    <div>
      {showChrome ? <PageHeader title="🎭 ทายสิ...ฉันคือใคร?" subtitle="Friend Bond" onBack={phase === 'mode' ? undefined : () => setPhase('mode')} hideBack={phase === 'mode'} /> : null}

      {phase === 'mode' ? (
        <ModeSelectStep
          onSelect={(m) => {
            setMode(m)
            setControlMode(null)
            if (m === 'solo') setPhase('category')
            else setPhase('player-count')
          }}
        />
      ) : null}

      {phase === 'player-count' ? (
        <PlayerCountStep
          onContinue={(count) => {
            setPlayerCount(count)
            setPlayerNames(Array.from({ length: count }, () => ''))
            setPhase('player-names')
          }}
        />
      ) : null}

      {phase === 'player-names' ? (
        <PlayerNamesStep
          count={playerCount}
          names={playerNames}
          onChange={setPlayerNames}
          onContinue={() => setPhase(mode === 'team' ? 'team-assign' : 'category')}
        />
      ) : null}

      {phase === 'team-assign' ? (
        <TeamAssignStep
          playerNames={playerNames.map((n, i) => n.trim() || `ผู้เล่น ${i + 1}`)}
          onContinue={(a, b, aIdx, bIdx) => {
            setTeamAName(a)
            setTeamBName(b)
            setTeamAIndices(aIdx)
            setTeamBIndices(bIdx)
            setPhase('category')
          }}
        />
      ) : null}

      {phase === 'category' ? (
        <CategorySelectStep
          selected={selectedSubcats}
          onChange={setSelectedSubcats}
          musicMode={musicMode}
          onMusicModeChange={setMusicMode}
          onContinue={() => setPhase('difficulty')}
        />
      ) : null}

      {phase === 'difficulty' ? (
        <DifficultyStep
          value={difficulty}
          onSelect={(d) => {
            setDifficulty(d)
            setPhase('timer')
          }}
        />
      ) : null}

      {phase === 'timer' ? (
        <TimerStep
          onSelect={(t) => {
            setTimerSeconds(t)
            proceedAfterTimer()
          }}
        />
      ) : null}

      {phase === 'how-to-play' ? <HowToPlayStep onReady={handleHowToPlayReady} /> : null}

      {phase === 'motion-setup' ? <MotionCalibrationStep onDone={handleMotionSetupDone} /> : null}

      {phase === 'handoff' && currentPlayer ? (
        <HandoffStep playerName={currentPlayer.name} teamLabel={currentTeamLabel()} onDone={() => setPhase('play')} />
      ) : null}

      {phase === 'play' && deck ? (
        <PlayScreen
          deck={deck}
          timerSeconds={timerSeconds}
          categoryLabel={categoryLabelFor(selectedSubcats)}
          controlMode={controlMode ?? 'buttons'}
          onRoundEnd={handleRoundEnd}
        />
      ) : null}

      {phase === 'round-summary' && lastResult && currentPlayer ? (
        <RoundSummaryStep
          playerName={currentPlayer.name}
          result={lastResult}
          continueLabel={turnIndex + 1 >= turnOrder.length ? 'ดูสรุปผล →' : 'ส่งต่อให้ผู้เล่นคนถัดไป →'}
          onContinue={handleRoundSummaryContinue}
        />
      ) : null}

      {phase === 'solo-summary' && lastResult ? (
        <SoloSummaryStep result={lastResult} onPlayAgain={playAgainSameConfig} onChangeCategory={resetToCategoryChange} onExit={() => navigate('/hub/friends')} />
      ) : null}

      {phase === 'scoreboard' ? (
        <ScoreboardStep players={players} onPlayAgain={playAgainSameConfig} onChangeCategory={resetToCategoryChange} onExit={() => navigate('/hub/friends')} />
      ) : null}

      {phase === 'team-summary' ? (
        <TeamSummaryStep
          teamAName={teamAName}
          teamAScore={teamAScore}
          teamBName={teamBName}
          teamBScore={teamBScore}
          onPlayAgain={playAgainSameConfig}
          onChangeCategory={resetToCategoryChange}
          onExit={() => navigate('/hub/friends')}
        />
      ) : null}

    </div>
  )
}
