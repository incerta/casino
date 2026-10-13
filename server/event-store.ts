import { initEventStore } from './shared/event-store/init-event-store'

import { gameOpened } from './events/game_opened'
import { betChanged } from './events/bet_changed'
import { roundPlayed } from './events/round_played'
import { bonusOffered } from './events/bonus_offered'
import { bonusClaimed } from './events/bonus_claimed'

export type EventStore = typeof initStore extends () => Promise<infer T>
  ? T
  : never

export const initStore = () =>
  initEventStore([
    gameOpened,
    betChanged,
    roundPlayed,
    bonusOffered,
    bonusClaimed,
  ])
