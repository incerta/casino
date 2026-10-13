import type { GameId } from './structs'

/** Every visitor starts each game with this many demo (non-monetary) credits */
export const DEMO_STARTING_BALANCE = 1000

/** Completed rounds after which the simulated bonus is offered */
export const BONUS_ROUND_THRESHOLD = 2

export type SlotSymbol = {
  id: string
  glyph: string
  /** Bet multiplier for a run of exactly `minMatch` identical symbols */
  multiplier: number
}

export type GameConfig = {
  id: GameId
  title: string
  description: string
  reelCount: number
  /**
   * The leftmost run of identical symbols pays when it is at least this long;
   * every extra matching reel adds one more `multiplier` step.
   */
  minMatch: number
  symbols: SlotSymbol[]
  bets: number[]
  defaultBet: number
  /**
   * Test environment only: probability that a spin is forced into a winning
   * combination, so visitors see simulated wins.
   */
  demoWinChance: number
}

export const GAMES: GameConfig[] = [
  {
    id: 'lucky-sevens' as GameId,
    title: 'Lucky Sevens',
    description: 'Classic 3-reel slot. Line up three identical symbols.',
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
    id: 'fruit-frenzy' as GameId,
    title: 'Fruit Frenzy',
    description: '5-reel fruit slot. Three or more matching from the left pay.',
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
