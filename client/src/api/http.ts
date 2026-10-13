import type { ClientAPI } from '@/generated/client-api-types'
import { initAPI } from './init-http'

export const httpAPI = initAPI<ClientAPI>({
  projection: {
    games: true,
    slotSession: true,
    diceSession: true,
    roadSession: true,
  },
  command: {
    openGame: true,
    changeBet: true,
    playRound: true,
    claimBonus: true,
    rollDice: true,
    startRoadRun: true,
    crossRoadLane: true,
    cashOutRoadRun: true,
  },
})
