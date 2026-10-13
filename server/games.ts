import type { GameId, RoadDifficulty } from './structs'

/** Every visitor starts each game with this many demo (non-monetary) credits */
export const DEMO_STARTING_BALANCE = 1000

/** Completed rounds after which the simulated bonus is offered */
export const BONUS_ROUND_THRESHOLD = 2

export type GameCategory = 'slots' | 'instant'
export type GameTag = 'top' | 'new' | 'popular'

type GameBase = {
  id: GameId
  title: string
  description: string
  category: GameCategory
  tags: GameTag[]
  /** Lobby tile art: a glyph on a two-stop gradient */
  art: { glyph: string; gradient: [string, string] }
  bets: number[]
  defaultBet: number
}

export type SlotSymbol = {
  id: string
  glyph: string
  /** Bet multiplier for a run of exactly `minMatch` identical symbols */
  multiplier: number
}

export type SlotGameConfig = GameBase & {
  type: 'slot'
  reelCount: number
  /**
   * The leftmost run of identical symbols pays when it is at least this long;
   * every extra matching reel adds one more `multiplier` step.
   */
  minMatch: number
  symbols: SlotSymbol[]
  /**
   * Test environment only: probability that a spin is forced into a winning
   * combination, so visitors see simulated wins.
   */
  demoWinChance: number
}

export type RoadDifficultyConfig = {
  label: string
  lanes: number
  /** Nominal chance of being hit on each lane; the multipliers derive from it */
  hitChance: number
  /**
   * Test environment only: the lower chance the server actually rolls
   * against, so visitors see a run progress.
   */
  demoHitChance: number
  /** Payout multiplier after crossing lane N is `multipliers[N - 1]` */
  multipliers: number[]
}

export type RoadGameConfig = GameBase & {
  type: 'road'
  difficulties: Record<RoadDifficulty, RoadDifficultyConfig>
  defaultDifficulty: RoadDifficulty
}

export type DiceGameConfig = GameBase & {
  type: 'dice'
  /** Target is a whole percent; the roll is 0..9999 (shown as 00.00..99.99) */
  minTarget: number
  maxTarget: number
  defaultTarget: number
  /** Test environment only: probability that a roll is forced into a win */
  demoWinChance: number
}

export type GameConfig = SlotGameConfig | RoadGameConfig | DiceGameConfig
export type GameType = GameConfig['type']

/** 3% edge: the multiplier pays 97% of the fair odds of surviving N lanes */
function roadDifficulty(
  label: string,
  lanes: number,
  hitChance: number,
  demoHitChance: number
): RoadDifficultyConfig {
  const multipliers = Array.from(
    { length: lanes },
    (_, index) => Math.floor(97 / (1 - hitChance) ** (index + 1)) / 100
  )

  return { label, lanes, hitChance, demoHitChance, multipliers }
}

export const GAMES: GameConfig[] = [
  {
    type: 'road',
    id: 'chicken-cross' as GameId,
    title: 'Chicken Cross',
    description:
      'Cross lane after lane, the multiplier grows with every step. Cash out before you get hit.',
    category: 'instant',
    tags: ['top', 'new', 'popular'],
    art: { glyph: '🐔', gradient: ['#ffb347', '#e8590c'] },
    bets: [5, 10, 25, 50],
    defaultBet: 10,
    difficulties: {
      easy: roadDifficulty('Easy', 24, 0.04, 0.02),
      medium: roadDifficulty('Medium', 22, 0.12, 0.06),
      hard: roadDifficulty('Hard', 20, 0.2, 0.1),
      hardcore: roadDifficulty('Hardcore', 15, 0.4, 0.2),
    },
    defaultDifficulty: 'easy',
  },
  {
    type: 'dice',
    id: 'neon-dice' as GameId,
    title: 'Neon Dice',
    description:
      'Pick a target and roll over or under it. Lower odds, higher multiplier.',
    category: 'instant',
    tags: ['new', 'popular'],
    art: { glyph: '🎲', gradient: ['#7755ff', '#2b1a7a'] },
    bets: [5, 10, 25, 50],
    defaultBet: 10,
    minTarget: 2,
    maxTarget: 98,
    defaultTarget: 50,
    demoWinChance: 0.5,
  },
  {
    type: 'slot',
    id: 'lucky-sevens' as GameId,
    title: 'Lucky Sevens',
    description: 'Classic 3-reel slot. Line up three identical symbols.',
    category: 'slots',
    tags: ['top', 'popular'],
    art: { glyph: '7️⃣', gradient: ['#e03131', '#5c0f0f'] },
    reelCount: 3,
    minMatch: 3,
    symbols: [
      { id: 'seven', glyph: '7️⃣', multiplier: 20 },
      { id: 'bell', glyph: '🔔', multiplier: 10 },
      { id: 'bar', glyph: '🎰', multiplier: 6 },
      { id: 'cherry', glyph: '🍒', multiplier: 4 },
      { id: 'lemon', glyph: '🍋', multiplier: 2 },
    ],
    bets: [10, 20, 50],
    defaultBet: 10,
    demoWinChance: 0.6,
  },
  {
    type: 'slot',
    id: 'fruit-frenzy' as GameId,
    title: 'Fruit Frenzy',
    description: '5-reel fruit slot. Three or more matching from the left pay.',
    category: 'slots',
    tags: ['top'],
    art: { glyph: '🍉', gradient: ['#2fbf4a', '#0b4d1c'] },
    reelCount: 5,
    minMatch: 3,
    symbols: [
      { id: 'diamond', glyph: '💎', multiplier: 15 },
      { id: 'watermelon', glyph: '🍉', multiplier: 8 },
      { id: 'grapes', glyph: '🍇', multiplier: 5 },
      { id: 'orange', glyph: '🍊', multiplier: 3 },
      { id: 'apple', glyph: '🍏', multiplier: 2 },
    ],
    bets: [5, 10, 25, 50],
    defaultBet: 10,
    demoWinChance: 0.5,
  },
]

export function findGame(id: GameId): GameConfig | undefined {
  return GAMES.find((game) => game.id === id)
}

/** Finds a game only if it is of the given type */
export function findGameOfType<T extends GameType>(
  id: GameId,
  type: T
): Extract<GameConfig, { type: T }> | undefined {
  const game = findGame(id)

  return game?.type === type
    ? (game as Extract<GameConfig, { type: T }>)
    : undefined
}
