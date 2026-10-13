import type { GameConfig } from './games'

export type Random = () => number

/**
 * Rolls one symbol per reel. With `demoWinChance` probability the spin is
 * forced to start with a winning run (test environment, simulated outcome).
 */
export function spinReels(game: GameConfig, random: Random): string[] {
  const pick = () => game.symbols[Math.floor(random() * game.symbols.length)]!

  const reels = Array.from({ length: game.reelCount }, () => pick().id)

  if (random() < game.demoWinChance) {
    const winning = pick().id
    const runLength =
      game.minMatch +
      Math.floor(random() * (game.reelCount - game.minMatch + 1))

    reels.fill(winning, 0, runLength)
  }

  return reels
}

/** Payout of the leftmost run of identical symbols */
export function evaluateReels(
  game: GameConfig,
  reels: string[],
  bet: number
): number {
  const [first] = reels
  const symbol = game.symbols.find((s) => s.id === first)

  if (symbol === undefined) return 0

  let run = 1
  while (run < reels.length && reels[run] === first) run++

  if (run < game.minMatch) return 0

  return bet * symbol.multiplier * (run - game.minMatch + 1)
}
