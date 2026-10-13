import type { ClientAPI } from '@/generated/client-api-types'
import { initAPI } from './init-http'

export const httpAPI = initAPI<ClientAPI>({
  projection: {
    games: true,
    gameSession: true,
  },
  command: {
    openGame: true,
    changeBet: true,
    playRound: true,
    claimBonus: true,
  },
})
