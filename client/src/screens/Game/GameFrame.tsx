'use client'

import Link from 'next/link'
import { cqrsApi } from '@/state/cqrs-api'
import type {
  BonusStatus,
  GameBase,
  GameId,
} from '@/generated/client-api-types'
import { BonusModal } from './BonusModal'
import styles from './GameFrame.module.css'

/**
 * Layout shared by every game kind: back link, title, demo stats, a control
 * panel next to the game stage, and the simulated bonus pop-up.
 */
export function GameFrame(props: {
  game: GameBase
  balance: number
  bet: number
  roundsPlayed: number
  bonus: BonusStatus
  /** False while a round is still animating or in progress */
  bonusReady: boolean
  controls: React.ReactNode
  children: React.ReactNode
}) {
  const { game } = props
  const [claimBonus, bonusMutation] = cqrsApi.useClaimBonusMutation()

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.back}>
          ← Lobby
        </Link>
        <span className="demo-badge">Test environment · simulated</span>
      </nav>

      <header className={styles.head}>
        <span
          className={styles.art}
          style={{
            background: `linear-gradient(160deg, ${game.art.gradient[0]}, ${game.art.gradient[1]})`,
          }}
          aria-hidden
        >
          {game.art.glyph}
        </span>
        <h1 className={styles.title}>{game.title}</h1>
        <dl className={styles.stats}>
          <div>
            <dt>Demo balance</dt>
            <dd>{props.balance}</dd>
          </div>
          <div>
            <dt>Bet</dt>
            <dd>{props.bet}</dd>
          </div>
          <div>
            <dt>Rounds</dt>
            <dd>{props.roundsPlayed}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.board}>
        <div className={styles.stage}>{props.children}</div>
        <div className={styles.panel}>{props.controls}</div>
      </section>

      {props.bonus === 'claimed' && (
        <p className={styles.claimed}>
          Simulated bonus claimed. No real-money value.
        </p>
      )}

      <p className={styles.disclaimer}>
        Demo mode: outcomes are simulated and biased toward wins for
        demonstration. Credits have no monetary value.
      </p>

      {props.bonus === 'offered' && props.bonusReady && (
        <BonusModal
          claiming={bonusMutation.isLoading}
          onClaim={() => claimBonus({ gameId: game.id })}
        />
      )}
    </main>
  )
}

export function GameMessage(props: { children: React.ReactNode }) {
  return <main className={styles.page}>{props.children}</main>
}

export function GameNotFound() {
  return (
    <GameMessage>
      <p>Game not found.</p>
      <Link href="/" className="btn btn-primary">
        Back to lobby
      </Link>
    </GameMessage>
  )
}

/** The bet buttons; a change is recorded as a `bet_changed` event */
export function BetSelector(props: {
  gameId: GameId
  bets: number[]
  bet: number
  disabled: boolean
}) {
  const [changeBet, betMutation] = cqrsApi.useChangeBetMutation()

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel} aria-hidden>
        Bet amount
      </span>
      <div className={styles.segmented} role="group" aria-label="Bet">
        {props.bets.map((value) => (
          <button
            key={value}
            aria-pressed={value === props.bet}
            disabled={props.disabled || betMutation.isLoading}
            onClick={() => changeBet({ gameId: props.gameId, bet: value })}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
