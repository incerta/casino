'use client'

import { useEffect } from 'react'
import { cqrsApi } from '@/state/cqrs-api'
import type { GameId } from '@/generated/client-api-types'
import { DiceGame } from './DiceGame'
import { GameMessage, GameNotFound } from './GameFrame'
import { RoadGame } from './RoadGame'
import { SlotGame } from './SlotGame'

/** Picks the screen for the game's kind; each kind has its own projection */
export function Game(props: { gameId: GameId }) {
  const games = cqrsApi.useGamesQuery({})
  const [openGame] = cqrsApi.useOpenGameMutation()

  useEffect(() => {
    openGame({ gameId: props.gameId })
  }, [openGame, props.gameId])

  if (games.isLoading || games.isUninitialized) {
    return <GameMessage>Loading…</GameMessage>
  }

  if (games.isError) {
    return (
      <GameMessage>
        <p>Network error: {games.error?.message ?? 'Unknown error'}</p>
        <button className="btn" onClick={() => games.refetch()}>
          Reload
        </button>
      </GameMessage>
    )
  }

  const game = games.data.data.find(({ id }) => id === props.gameId)

  if (game === undefined) return <GameNotFound />

  switch (game.type) {
    case 'slot':
      return <SlotGame gameId={game.id} />
    case 'dice':
      return <DiceGame gameId={game.id} />
    case 'road':
      return <RoadGame gameId={game.id} />
    default: {
      const missed: never = game
      console.error('missed case:', missed)
      return null
    }
  }
}
