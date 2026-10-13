/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: bun run gen:client-api-types (from server/), or
 * bun run gen from the repo root.
 */

export type ActiveRoadRun = {
  runId: RunId
  difficulty: RoadDifficulty
  bet: number
  lane: number
  multiplier: number
  nextMultiplier: number
  potentialWin: number
}

export type BonusStatus = 'none' | 'offered' | 'claimed'

export type DiceDirection = 'over' | 'under'

export type DiceGameConfig = GameBase & {
  type: 'dice'
  minTarget: number
  maxTarget: number
  defaultTarget: number
  demoWinChance: number
}

export type DiceRoll = {
  rollId: RollId
  bet: number
  target: number
  direction: DiceDirection
  roll: number
  multiplier: number
  win: number
}

export type FinishedRoadRun = {
  runId: RunId
  difficulty: RoadDifficulty
  outcome: 'hit' | 'cashed_out'
  lane: number
  win: number
}

export type GameBase = {
  id: GameId
  title: string
  description: string
  category: GameCategory
  tags: GameTag[]
  art: { glyph: string; gradient: [string, string] }
  bets: number[]
  defaultBet: number
}

export type GameCategory = 'slots' | 'instant'

export type GameConfig = SlotGameConfig | RoadGameConfig | DiceGameConfig

export type GameId = { __idFor: 'Game' } & string

export type GameTag = 'top' | 'new' | 'popular'

export type LastRound = {
  roundId: RoundId
  bet: number
  reels: readonly string[]
  win: number
}

export type RoadDifficulty = 'easy' | 'medium' | 'hard' | 'hardcore'

export type RoadDifficultyConfig = {
  label: string
  lanes: number
  hitChance: number
  demoHitChance: number
  multipliers: number[]
}

export type RoadGameConfig = GameBase & {
  type: 'road'
  difficulties: Record<RoadDifficulty, RoadDifficultyConfig>
  defaultDifficulty: RoadDifficulty
}

export type RollId = { __idFor: 'Roll' } & string

export type RoundId = { __idFor: 'Round' } & string

export type RunId = { __idFor: 'Run' } & string

export type SlotGameConfig = GameBase & {
  type: 'slot'
  reelCount: number
  minMatch: number
  symbols: SlotSymbol[]
  demoWinChance: number
}

export type SlotSymbol = { id: string; glyph: string; multiplier: number }

export type ClientAPI = {
  readonly projection: {
    readonly games: (
      payload: unknown
    ) => Promise<{ readonly success: true; readonly data: GameConfig[] }>
    readonly slotSession: (payload: { gameId: GameId }) => Promise<
      | {
          readonly success: false
          readonly reason: 'game-not-found'
          readonly data?: undefined
        }
      | {
          readonly success: true
          readonly data: {
            readonly game: SlotGameConfig
            readonly balance: number
            readonly bet: number
            readonly roundsPlayed: number
            readonly lastRound: LastRound | null
            readonly bonus: BonusStatus
          }
          readonly reason?: undefined
        }
    >
    readonly diceSession: (payload: { gameId: GameId }) => Promise<
      | {
          readonly success: false
          readonly reason: 'game-not-found'
          readonly data?: undefined
        }
      | {
          readonly success: true
          readonly data: {
            readonly game: DiceGameConfig
            readonly balance: number
            readonly bet: number
            readonly roundsPlayed: number
            readonly lastRoll: DiceRoll | null
            readonly history: DiceRoll[]
            readonly bonus: BonusStatus
          }
          readonly reason?: undefined
        }
    >
    readonly roadSession: (payload: { gameId: GameId }) => Promise<
      | {
          readonly success: false
          readonly reason: 'game-not-found'
          readonly data?: undefined
        }
      | {
          readonly success: true
          readonly data: {
            readonly game: RoadGameConfig
            readonly balance: number
            readonly bet: number
            readonly roundsPlayed: number
            readonly activeRun: ActiveRoadRun | null
            readonly lastRun: FinishedRoadRun | null
            readonly bonus: BonusStatus
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
      | { readonly success: false; readonly reason: 'game-not-found' }
      | {
          readonly success: false
          readonly reason: 'insufficient-demo-balance'
        }
      | { readonly success: true; readonly reason?: undefined }
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
    readonly rollDice: (payload: {
      gameId: GameId
      target: number
      direction: DiceDirection
    }) => Promise<
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
      | { readonly success: false; readonly reason: 'invalid-target' }
      | {
          readonly success: false
          readonly reason: 'insufficient-demo-balance'
        }
      | { readonly success: true; readonly reason?: undefined }
    >
    readonly startRoadRun: (payload: {
      gameId: GameId
      difficulty: RoadDifficulty
    }) => Promise<
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
      | { readonly success: false; readonly reason: 'invalid-difficulty' }
      | { readonly success: false; readonly reason: 'run-in-progress' }
      | {
          readonly success: false
          readonly reason: 'insufficient-demo-balance'
        }
      | { readonly success: true; readonly reason?: undefined }
    >
    readonly crossRoadLane: (payload: { gameId: GameId }) => Promise<
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
      | { readonly success: false; readonly reason: 'no-active-run' }
      | { readonly success: true; readonly reason?: undefined }
    >
    readonly cashOutRoadRun: (payload: { gameId: GameId }) => Promise<
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
      | { readonly success: false; readonly reason: 'no-active-run' }
      | { readonly success: false; readonly reason: 'nothing-to-cash-out' }
      | { readonly success: true; readonly reason?: undefined }
    >
  }
}
