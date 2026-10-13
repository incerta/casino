'use client'

import { useState } from 'react'
import { cqrsApi } from '@/state/cqrs-api'
import type {
  ClientAPI,
  DiceDirection,
  GameId,
} from '@/generated/client-api-types'
import { BetSelector, GameFrame, GameMessage, GameNotFound } from './GameFrame'
import frame from './GameFrame.module.css'
import styles from './DiceGame.module.css'

type DiceSession = Extract<
  Awaited<ReturnType<ClientAPI['projection']['diceSession']>>,
  { success: true }
>['data']
type RollDiceResult = Awaited<ReturnType<ClientAPI['command']['rollDice']>>

/** Rolls are whole numbers 0..9999, shown as 00.00..99.99 */
function formatRoll(roll: number) {
  return (roll / 100).toFixed(2).padStart(5, '0')
}

export function DiceGame(props: { gameId: GameId }) {
  const session = cqrsApi.useDiceSessionQuery({ gameId: props.gameId })

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

  return <DiceTable session={res.data} refreshing={session.isFetching} />
}

function DiceTable(props: { session: DiceSession; refreshing: boolean }) {
  const { game, balance, bet, roundsPlayed, lastRoll, history, bonus } =
    props.session
  const [rollDice, rollMutation] = cqrsApi.useRollDiceMutation()
  const [target, setTarget] = useState(lastRoll?.target ?? game.defaultTarget)
  const [direction, setDirection] = useState<DiceDirection>(
    lastRoll?.direction ?? 'under'
  )
  const [rolling, setRolling] = useState(false)

  // Display only: the server decides the roll and computes the real payout
  const winChance = direction === 'under' ? target : 100 - target
  const multiplier = Math.floor(9900 / winChance) / 100
  const busy = rolling || rollMutation.isLoading || props.refreshing

  async function handleRoll() {
    setRolling(true)
    // Keep the roll animation visible for a moment even on a fast API
    await Promise.all([
      rollDice({ gameId: game.id, target, direction }),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ])
    setRolling(false)
  }

  const shownRoll = rolling ? null : lastRoll
  const trackBackground =
    direction === 'under'
      ? `linear-gradient(90deg, var(--success) 0 ${target}%, var(--danger) ${target}% 100%)`
      : `linear-gradient(90deg, var(--danger) 0 ${target}%, var(--success) ${target}% 100%)`

  return (
    <GameFrame
      game={game}
      balance={balance}
      bet={bet}
      roundsPlayed={roundsPlayed}
      bonus={bonus}
      bonusReady={!rolling}
      controls={
        <>
          <BetSelector
            gameId={game.id}
            bets={game.bets}
            bet={bet}
            disabled={busy}
          />

          <div className={frame.field}>
            <span className={frame.fieldLabel} aria-hidden>
              Direction
            </span>
            <div
              className={frame.segmented}
              role="group"
              aria-label="Direction"
            >
              <button
                aria-pressed={direction === 'under'}
                disabled={busy}
                onClick={() => setDirection('under')}
              >
                Roll under
              </button>
              <button
                aria-pressed={direction === 'over'}
                disabled={busy}
                onClick={() => setDirection('over')}
              >
                Roll over
              </button>
            </div>
          </div>

          <dl className={styles.readouts}>
            <div>
              <dt>Win chance</dt>
              <dd>{winChance}%</dd>
            </div>
            <div>
              <dt>Multiplier</dt>
              <dd>{multiplier.toFixed(2)}x</dd>
            </div>
            <div>
              <dt>Payout on win</dt>
              <dd>{Math.floor(bet * multiplier)}</dd>
            </div>
          </dl>

          <button
            className={`btn btn-cta ${frame.action}`}
            disabled={busy}
            onClick={handleRoll}
          >
            Roll
          </button>
          {renderRollError(rollMutation.data)}
        </>
      }
    >
      <output
        className={`${styles.readout} ${rolling ? styles.rolling : ''} ${
          shownRoll === null ? '' : shownRoll.win > 0 ? styles.won : styles.lost
        }`}
        aria-label="Roll result"
      >
        {shownRoll === null
          ? rolling
            ? '··.··'
            : '--.--'
          : formatRoll(shownRoll.roll)}
      </output>

      <p
        className={`${frame.result} ${
          shownRoll !== null && shownRoll.win > 0 ? frame.win : ''
        }`}
      >
        {rolling
          ? 'Rolling…'
          : lastRoll === null
            ? 'Pick a target and press Roll'
            : lastRoll.win > 0
              ? `Rolled ${formatRoll(lastRoll.roll)} · You won ${lastRoll.win} demo credits (simulated)`
              : `Rolled ${formatRoll(lastRoll.roll)} · No win this time`}
      </p>

      <div className={styles.slider}>
        <div className={styles.scale} aria-hidden>
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
        <div className={styles.trackWrap}>
          {shownRoll !== null && (
            <span
              className={`${styles.marker} ${
                shownRoll.win > 0 ? styles.won : styles.lost
              }`}
              style={{
                left: `clamp(28px, ${shownRoll.roll / 100}%, calc(100% - 28px))`,
              }}
              aria-hidden
            >
              {formatRoll(shownRoll.roll)}
            </span>
          )}
          <input
            type="range"
            className={styles.range}
            style={{ background: trackBackground }}
            min={game.minTarget}
            max={game.maxTarget}
            step={1}
            value={target}
            disabled={busy}
            aria-label="Target"
            aria-valuetext={`Roll ${direction} ${target}`}
            onChange={(event) => setTarget(Number(event.target.value))}
          />
        </div>
        <p className={styles.targetLabel}>
          Roll {direction} <strong>{target.toFixed(2)}</strong>
        </p>
      </div>

      <ol className={styles.history} aria-label="Recent rolls">
        {history.map((roll) => (
          <li
            key={roll.rollId}
            className={roll.win > 0 ? styles.won : styles.lost}
          >
            {formatRoll(roll.roll)}
          </li>
        ))}
      </ol>
    </GameFrame>
  )
}

function renderRollError(res: RollDiceResult | undefined) {
  if (res === undefined || res.success) return null

  switch (res.reason) {
    case 'insufficient-demo-balance':
      return <p className={frame.error}>Not enough demo credits.</p>
    case 'invalid-target':
      return <p className={frame.error}>Pick a target between 2 and 98.</p>
    case 'conflict':
      return <p className={frame.error}>Roll already in progress.</p>
    case 'game-not-found':
    case 'invalid':
      return <p className={frame.error}>Something went wrong.</p>
    default: {
      const missed: never = res
      console.error('missed case:', missed)
      return null
    }
  }
}
