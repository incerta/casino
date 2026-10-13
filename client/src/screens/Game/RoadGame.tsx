'use client'

import { useEffect, useRef, useState } from 'react'
import { cqrsApi } from '@/state/cqrs-api'
import type {
  ClientAPI,
  GameId,
  RoadDifficulty,
} from '@/generated/client-api-types'
import { BetSelector, GameFrame, GameMessage, GameNotFound } from './GameFrame'
import frame from './GameFrame.module.css'
import styles from './RoadGame.module.css'

type RoadSession = Extract<
  Awaited<ReturnType<ClientAPI['projection']['roadSession']>>,
  { success: true }
>['data']
type Result<K extends keyof ClientAPI['command']> = Awaited<
  ReturnType<ClientAPI['command'][K]>
>

const DIFFICULTIES: RoadDifficulty[] = ['easy', 'medium', 'hard', 'hardcore']

export function RoadGame(props: { gameId: GameId }) {
  const session = cqrsApi.useRoadSessionQuery({ gameId: props.gameId })

  if (session.isLoading || session.isUninitialized) {
    return <GameMessage>Loading…</GameMessage>
  }

  if (session.isError) {
    return (
      <GameMessage>
        <p>Network error: {session.error?.message ?? 'Unknown error'}</p>
        <button className="btn" onClick={() => session.refetch()}>
          Reload
        </button>
      </GameMessage>
    )
  }

  const res = session.data

  if (res.success === false) {
    switch (res.reason) {
      case 'game-not-found':
        return <GameNotFound />
      default: {
        const missed: never = res
        console.error('missed case:', missed)
        return null
      }
    }
  }

  return <RoadTable session={res.data} refreshing={session.isFetching} />
}

function RoadTable(props: { session: RoadSession; refreshing: boolean }) {
  const { game, balance, bet, roundsPlayed, activeRun, lastRun, bonus } =
    props.session
  const [startRoadRun, startMutation] = cqrsApi.useStartRoadRunMutation()
  const [crossRoadLane, crossMutation] = cqrsApi.useCrossRoadLaneMutation()
  const [cashOutRoadRun, cashOutMutation] = cqrsApi.useCashOutRoadRunMutation()
  const [selected, setSelected] = useState<RoadDifficulty>(
    activeRun?.difficulty ?? lastRun?.difficulty ?? game.defaultDifficulty
  )
  const [error, setError] = useState<string | null>(null)
  const trackRef = useRef<HTMLOListElement>(null)

  const difficulty = activeRun?.difficulty ?? selected
  const config = game.difficulties[difficulty]
  const busy =
    startMutation.isLoading ||
    crossMutation.isLoading ||
    cashOutMutation.isLoading ||
    props.refreshing
  // The finished run is drawn on the track only while it fits the track
  const finishedRun =
    activeRun === null && lastRun?.difficulty === difficulty ? lastRun : null
  const chickenLane =
    activeRun !== null
      ? activeRun.lane
      : finishedRun?.outcome === 'cashed_out'
        ? finishedRun.lane
        : 0
  const hitLane = finishedRun?.outcome === 'hit' ? finishedRun.lane : null
  const focusLane = hitLane ?? chickenLane

  useEffect(() => {
    const track = trackRef.current
    const cell = track?.querySelector<HTMLElement>(`[data-lane="${focusLane}"]`)
    if (!track || !cell) return
    track.scrollTo({
      left: cell.offsetLeft - track.clientWidth / 2 + cell.offsetWidth / 2,
      behavior: 'smooth',
    })
  }, [focusLane, difficulty])

  async function handleStart() {
    const res = await startRoadRun({ gameId: game.id, difficulty: selected })
    setError(
      res.data === undefined
        ? (res.error.message ?? 'Network error')
        : startError(res.data)
    )
  }

  async function handleGo() {
    const res = await crossRoadLane({ gameId: game.id })
    setError(
      res.data === undefined
        ? (res.error.message ?? 'Network error')
        : crossError(res.data)
    )
  }

  async function handleCashOut() {
    const res = await cashOutRoadRun({ gameId: game.id })
    setError(
      res.data === undefined
        ? (res.error.message ?? 'Network error')
        : cashOutError(res.data)
    )
  }

  return (
    <GameFrame
      game={game}
      balance={balance}
      bet={bet}
      roundsPlayed={roundsPlayed}
      bonus={bonus}
      bonusReady={activeRun === null && !busy}
      controls={
        <>
          <BetSelector
            gameId={game.id}
            bets={game.bets}
            bet={bet}
            disabled={busy || activeRun !== null}
          />

          <div className={frame.field}>
            <span className={frame.fieldLabel} aria-hidden>
              Difficulty
            </span>
            <div
              className={frame.segmented}
              role="group"
              aria-label="Difficulty"
            >
              {DIFFICULTIES.map((value) => (
                <button
                  key={value}
                  aria-pressed={value === difficulty}
                  disabled={busy || activeRun !== null}
                  onClick={() => setSelected(value)}
                >
                  {game.difficulties[value].label}
                </button>
              ))}
            </div>
            <span className={styles.difficultyInfo}>
              {config.lanes} lanes · up to{' '}
              {config.multipliers[config.multipliers.length - 1]}x
            </span>
          </div>

          {activeRun === null ? (
            <button
              className={`btn btn-cta ${frame.action}`}
              disabled={busy}
              onClick={handleStart}
            >
              Play
            </button>
          ) : (
            <div className={styles.runActions}>
              <button
                className={`btn btn-cta ${frame.action}`}
                disabled={busy}
                onClick={handleGo}
              >
                Go
              </button>
              <button
                className={`btn btn-primary ${frame.action}`}
                disabled={busy || activeRun.lane === 0}
                onClick={handleCashOut}
              >
                Cash out {activeRun.potentialWin}
              </button>
            </div>
          )}
          {error !== null && <p className={frame.error}>{error}</p>}
        </>
      }
    >
      <ol
        ref={trackRef}
        className={styles.track}
        aria-label={`Road, ${config.lanes} lanes`}
      >
        <li className={`${styles.cell} ${styles.sidewalk}`} data-lane={0}>
          {chickenLane === 0 && hitLane === null && (
            <span className={styles.chicken} aria-label="Chicken">
              🐔
            </span>
          )}
        </li>
        {config.multipliers.map((multiplier, index) => {
          const lane = index + 1
          const passed = lane < chickenLane
          const here = lane === chickenLane
          const hit = lane === hitLane
          const ahead = !passed && !here && !hit
          return (
            <li
              key={lane}
              data-lane={lane}
              className={`${styles.cell} ${styles.lane} ${
                passed ? styles.passed : ''
              } ${here ? styles.here : ''} ${hit ? styles.hit : ''} ${
                lane === chickenLane + 1 && activeRun !== null
                  ? styles.next
                  : ''
              }`}
            >
              {ahead && (
                <span
                  className={styles.car}
                  style={{
                    animationDuration: `${1.6 + (lane % 4) * 0.45}s`,
                    animationDelay: `${-(lane * 0.37) % 2}s`,
                  }}
                  aria-hidden
                >
                  🚗
                </span>
              )}
              <span className={styles.coin}>{multiplier.toFixed(2)}x</span>
              {here && (
                <span className={styles.chicken} aria-label="Chicken">
                  🐔
                </span>
              )}
              {hit && (
                <span className={styles.crash} aria-label="Hit by a car">
                  💥
                </span>
              )}
            </li>
          )
        })}
        <li className={`${styles.cell} ${styles.finish}`} aria-hidden>
          🏁
        </li>
      </ol>

      <p
        className={`${frame.result} ${
          activeRun === null && lastRun?.outcome === 'cashed_out'
            ? frame.win
            : ''
        }`}
        aria-live="polite"
      >
        {statusText(props.session)}
      </p>
    </GameFrame>
  )
}

function statusText(session: RoadSession) {
  const { activeRun, lastRun } = session

  if (activeRun !== null) {
    return activeRun.lane === 0
      ? `Run started · press Go to cross lane 1 (${activeRun.nextMultiplier}x)`
      : `Lane ${activeRun.lane} crossed · ${activeRun.multiplier}x · next ${activeRun.nextMultiplier}x`
  }

  if (lastRun === null) return 'Pick a difficulty and press Play'

  switch (lastRun.outcome) {
    case 'hit':
      return `Hit by a car on lane ${lastRun.lane} (simulated)`
    case 'cashed_out':
      return `Cashed out ${lastRun.win} demo credits (simulated)`
    default: {
      const missed: never = lastRun.outcome
      console.error('missed case:', missed)
      return null
    }
  }
}

function startError(res: Result<'startRoadRun'>): string | null {
  if (res.success) return null

  switch (res.reason) {
    case 'insufficient-demo-balance':
      return 'Not enough demo credits.'
    case 'run-in-progress':
    case 'conflict':
      return 'A run is already in progress.'
    case 'invalid-difficulty':
    case 'game-not-found':
    case 'invalid':
      return 'Something went wrong.'
    default: {
      const missed: never = res
      console.error('missed case:', missed)
      return null
    }
  }
}

function crossError(res: Result<'crossRoadLane'>): string | null {
  if (res.success) return null

  switch (res.reason) {
    case 'no-active-run':
      return 'This run has already ended.'
    case 'conflict':
      return 'Already moving, try again.'
    case 'game-not-found':
    case 'invalid':
      return 'Something went wrong.'
    default: {
      const missed: never = res
      console.error('missed case:', missed)
      return null
    }
  }
}

function cashOutError(res: Result<'cashOutRoadRun'>): string | null {
  if (res.success) return null

  switch (res.reason) {
    case 'no-active-run':
      return 'This run has already ended.'
    case 'nothing-to-cash-out':
      return 'Cross at least one lane before cashing out.'
    case 'conflict':
      return 'Already moving, try again.'
    case 'game-not-found':
    case 'invalid':
      return 'Something went wrong.'
    default: {
      const missed: never = res
      console.error('missed case:', missed)
      return null
    }
  }
}
