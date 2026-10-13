'use client'

import { useState } from 'react'
import { cqrsApi } from '@/state/cqrs-api'
import type { ClientAPI, GameId } from '@/generated/client-api-types'
import { BetSelector, GameFrame, GameMessage, GameNotFound } from './GameFrame'
import frame from './GameFrame.module.css'
import styles from './SlotGame.module.css'

type PlayRoundResult = Awaited<ReturnType<ClientAPI['command']['playRound']>>

export function SlotGame(props: { gameId: GameId }) {
  const session = cqrsApi.useSlotSessionQuery({ gameId: props.gameId })
  const [playRound, roundMutation] = cqrsApi.usePlayRoundMutation()
  const [spinning, setSpinning] = useState(false)

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
    <GameFrame
      game={game}
      balance={balance}
      bet={bet}
      roundsPlayed={roundsPlayed}
      bonus={bonus}
      bonusReady={!spinning}
      controls={
        <>
          <BetSelector
            gameId={game.id}
            bets={game.bets}
            bet={bet}
            disabled={busy}
          />
          <button
            className={`btn btn-cta ${frame.action}`}
            disabled={busy}
            onClick={handleSpin}
          >
            Spin
          </button>
          {renderRoundError(roundMutation.data)}
        </>
      }
    >
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

      <p
        className={`${frame.result} ${
          !spinning && lastRound !== null && lastRound.win > 0 ? frame.win : ''
        }`}
      >
        {spinning
          ? 'Spinning…'
          : lastRound === null
            ? 'Press Spin to play a demo round'
            : lastRound.win > 0
              ? `You won ${lastRound.win} demo credits (simulated)`
              : 'No win this time'}
      </p>

      <ul className={styles.paytable} aria-label="Paytable">
        {game.symbols.map((symbol) => (
          <li key={symbol.id}>
            <span aria-hidden>{symbol.glyph}</span> ×{symbol.multiplier}
          </li>
        ))}
      </ul>
    </GameFrame>
  )
}

function renderRoundError(res: PlayRoundResult | undefined) {
  if (res === undefined || res.success) return null

  switch (res.reason) {
    case 'insufficient-demo-balance':
      return <p className={frame.error}>Not enough demo credits.</p>
    case 'conflict':
      return <p className={frame.error}>Round already in progress.</p>
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
