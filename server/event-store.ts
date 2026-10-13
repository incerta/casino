import { initEventStore } from './shared/event-store/init-event-store'

import { gameOpened } from './events/game_opened'
import { betChanged } from './events/bet_changed'
import { roundPlayed } from './events/round_played'
import { bonusOffered } from './events/bonus_offered'
import { bonusClaimed } from './events/bonus_claimed'
import { diceRolled } from './events/dice_rolled'
import { roadRunStarted } from './events/road_run_started'
import { roadLaneCrossed } from './events/road_lane_crossed'
import { roadRunHit } from './events/road_run_hit'
import { roadRunCashedOut } from './events/road_run_cashed_out'

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
    diceRolled,
    roadRunStarted,
    roadLaneCrossed,
    roadRunHit,
    roadRunCashedOut,
  ])
