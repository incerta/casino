'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cqrsApi } from '@/state/cqrs-api'
import type { ClientAPI, GameId } from '@/generated/client-api-types'
import { BonusModal } from './BonusModal'
import styles from './Game.module.css'

type PlayRoundResult = Awaited<ReturnType<ClientAPI['command']['playRound']>>

export function Game(props: { gameId: GameId }) {
  const session = cqrsApi.useGameSessionQuery({ gameId: props.gameId })
  const [openGame] = cqrsApi.useOpenGameMutation()
  const [changeBet, betMutation] = cqrsApi.useChangeBetMutation()
  const [playRound, roundMutation] = cqrsApi.usePlayRoundMutation()
  const [claimBonus, bonusMutation] = cqrsApi.useClaimBonusMutation()
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    openGame({ gameId: props.gameId })
  }, [openGame, props.gameId])

  if (session.isLoading || session.isUninitialized) {
    return <main className={styles.page}>Loading…</main>
  }

  if (session.isError) {
    return (
      <main className={styles.page}>
        <p>Network error: {session.error?.message ?? 'Unknown error'}</p>
        <button onClick={() => session.refetch()}>Reload</button>
      </main>
    )
  }

  const res = session.data

  if (res.success === false) {
    switch (res.reason) {
      case 'game-not-found':
        return (
          <main className={styles.page}>
            <p>Game not found.</p>
            <Link href="/">Back to lobby</Link>
          </main>
        )
      default: {
        const missed: never = res
        console.error('missed case:', missed)
        return null
      }
    }
  }

  const { game, balance, bet, lastRound, roundsPlayed, bonus } = res.data
  const glyphById = new Map(game.symbols.map((s) => [s.id, s.glyph]))
  const reels =
    lastRound?.reels ?? game.symbols.slice(0, game.reelCount).map((s) => s.id)
  const busy = spinning || roundMutation.isLoading || session.isFetching

  async function handleSpin() {
    setSpinning(true)
    // Keep the spin animation visible for a moment even on a fast API
    await Promise.all([
      playRound({ gameId: game.id }),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ])
    setSpinning(false)
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.back}>
          ← Lobby
        </Link>
        <span className="demo-badge">Test environment · simulated</span>
      </nav>

      <section className={styles.machine}>
        <h1 className={styles.title}>{game.title}</h1>

        <div
          className={styles.reels}
          style={{ gridTemplateColumns: `repeat(${game.reelCount}, 1fr)` }}
          aria-live="polite"
        >
          {reels.map((symbolId, index) => (
            <div
              key={index}
              className={`${styles.reel} ${spinning ? styles.spinning : ''}`}
            >
              {glyphById.get(symbolId) ?? '❔'}
            </div>
          ))}
        </div>

        <p className={styles.result}>
          {spinning
            ? 'Spinning…'
            : lastRound === null
              ? 'Press Spin to play a demo round'
              : lastRound.win > 0
                ? `You won ${lastRound.win} demo credits (simulated)`
                : 'No win this time'}
        </p>
        {renderRoundError(roundMutation.data)}

        <dl className={styles.stats}>
          <div>
            <dt>Demo balance</dt>
            <dd>{balance}</dd>
          </div>
          <div>
            <dt>Bet</dt>
            <dd>{bet}</dd>
          </div>
          <div>
            <dt>Rounds</dt>
            <dd>{roundsPlayed}</dd>
          </div>
        </dl>

        <div className={styles.bets} role="group" aria-label="Bet">
          {game.bets.map((value) => (
            <button
              key={value}
              className={value === bet ? styles.betActive : styles.bet}
              disabled={busy || betMutation.isLoading}
              onClick={() => changeBet({ gameId: game.id, bet: value })}
            >
              {value}
            </button>
          ))}
        </div>

        <button className={styles.spin} disabled={busy} onClick={handleSpin}>
          Spin
        </button>

        {bonus === 'claimed' && (
          <p className={styles.claimed}>
            Simulated bonus claimed. No real-money value.
          </p>
        )}

        <p className={styles.disclaimer}>
          Demo mode: outcomes are simulated and biased toward wins for
          demonstration. Credits have no monetary value.
        </p>
      </section>

      {bonus === 'offered' && !spinning && (
        <BonusModal
          claiming={bonusMutation.isLoading}
          onClaim={() => claimBonus({ gameId: game.id })}
        />
      )}
    </main>
  )
}

function renderRoundError(res: PlayRoundResult | undefined) {
  if (res === undefined || res.success) return null

  switch (res.reason) {
    case 'insufficient-demo-balance':
      return <p className={styles.error}>Not enough demo credits.</p>
    case 'conflict':
      return <p className={styles.error}>Round already in progress.</p>
    case 'game-not-found':
    case 'invalid':
      return <p className={styles.error}>Something went wrong.</p>
    default: {
      const missed: never = res
      console.error('missed case:', missed)
      return null
    }
  }
}
