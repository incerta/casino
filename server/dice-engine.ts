import type { DiceGameConfig } from './games'
import type { DiceDirection } from './structs'
import type { Random } from './slot-engine'

/** Rolls are whole numbers in 0..ROLL_RANGE-1, shown as 00.00..99.99 */
export const ROLL_RANGE = 10000

/** Win chance in whole percent for a target and direction */
export function diceWinChance(target: number, direction: DiceDirection) {
  return direction === 'under' ? target : 100 - target
}

/** 1% edge: pays 99% of the fair odds, floored to two decimals */
export function diceMultiplier(target: number, direction: DiceDirection) {
  return Math.floor(9900 / diceWinChance(target, direction)) / 100
}

export function isDiceWin(
  roll: number,
  target: number,
  direction: DiceDirection
) {
  return direction === 'under' ? roll < target * 100 : roll >= target * 100
}

/**
 * Uniform roll. With `demoWinChance` probability the roll is drawn from the
 * winning range instead (test environment, simulated outcome).
 */
export function rollDie(
  game: DiceGameConfig,
  target: number,
  direction: DiceDirection,
  random: Random
): number {
  if (random() >= game.demoWinChance) {
    return Math.floor(random() * ROLL_RANGE)
  }

  const winningSize = diceWinChance(target, direction) * 100
  const offset = Math.floor(random() * winningSize)

  return direction === 'under' ? offset : target * 100 + offset
}
