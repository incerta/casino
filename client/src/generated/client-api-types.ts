/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: bun run gen:client-api-types (from server/), or
 * bun run gen from the repo root.
 */

export type BonusStatus = 'none' | 'offered' | 'claimed'

export type GameConfig = {
  id: GameId
  title: string
  description: string
  reelCount: number
  minMatch: number
  symbols: SlotSymbol[]
  bets: number[]
  defaultBet: number
  demoWinChance: number
}

export type GameId = { __idFor: 'Game' } & string

export type LastRound = {
  roundId: RoundId
  bet: number
  reels: readonly string[]
  win: number
}

export type RoundId = { __idFor: 'Round' } & string

export type SlotSymbol = { id: string; glyph: string; multiplier: number }

export type ClientAPI = {
  readonly projection: {
    readonly games: (
      payload: unknown
    ) => Promise<{ readonly success: true; readonly data: GameConfig[] }>
    readonly gameSession: (payload: { gameId: GameId }) => Promise<
      | {
          readonly success: false
          readonly reason: 'game-not-found'
          readonly data?: undefined
        }
      | {
          readonly success: true
          readonly data: {
            readonly balance: number
            readonly bet: number
            readonly roundsPlayed: number
            readonly lastRound: LastRound | null
            readonly bonus: BonusStatus
            readonly game: GameConfig
          }
          readonly reason?: undefined
        }
    >
  }
  readonly command: {
    readonly openGame: (payload: { gameId: GameId }) => Promise<
      | { success: false; reason: 'conflict' }
      | {
          success: false
          reason: 'invalid'
          error: {
            code:
              | 'INVALID_TYPE'
              | 'INVALID_RANGE'
              | 'INVALID_UNION'
              | 'INVALID_SCHEMA'
            path: (string | number)[]
          }[]
        }
      | { readonly success: false; readonly reason: 'game-not-found' }
      | { readonly success: true; readonly reason?: undefined }
    >
    readonly changeBet: (payload: { gameId: GameId; bet: number }) => Promise<
      | { success: false; reason: 'conflict' }
      | {
          success: false
          reason: 'invalid'
          error: {
            code:
              | 'INVALID_TYPE'
              | 'INVALID_RANGE'
              | 'INVALID_UNION'
              | 'INVALID_SCHEMA'
            path: (string | number)[]
          }[]
        }
      | { readonly success: false; readonly reason: 'game-not-found' }
      | { readonly success: false; readonly reason: 'bet-not-allowed' }
      | { readonly success: true; readonly reason?: undefined }
    >
    readonly playRound: (payload: { gameId: GameId }) => Promise<
      | { success: false; reason: 'conflict' }
      | {
          success: false
          reason: 'invalid'
          error: {
            code:
              | 'INVALID_TYPE'
              | 'INVALID_RANGE'
              | 'INVALID_UNION'
              | 'INVALID_SCHEMA'
            path: (string | number)[]
          }[]
        }
      | {
          readonly success: false
          readonly reason: 'game-not-found'
          readonly data?: undefined
        }
      | {
          readonly success: false
          readonly reason: 'insufficient-demo-balance'
          readonly data?: undefined
        }
      | {
          readonly success: true
          readonly data: {
            readonly roundId: RoundId
            readonly reels: string[]
            readonly win: number
            readonly balanceAfter: number
            readonly bonusOffered: boolean
          }
          readonly reason?: undefined
        }
    >
    readonly claimBonus: (payload: { gameId: GameId }) => Promise<
      | { success: false; reason: 'conflict' }
      | {
          success: false
          reason: 'invalid'
          error: {
            code:
              | 'INVALID_TYPE'
              | 'INVALID_RANGE'
              | 'INVALID_UNION'
              | 'INVALID_SCHEMA'
            path: (string | number)[]
          }[]
        }
      | { readonly success: false; readonly reason: 'game-not-found' }
      | { readonly success: false; readonly reason: 'bonus-not-offered' }
      | { readonly success: false; readonly reason: 'bonus-already-claimed' }
      | { readonly success: true; readonly reason?: undefined }
    >
  }
}
