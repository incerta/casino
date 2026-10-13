export type BonusStatus = 'none' | 'offered' | 'claimed'

/**
 * Projection-only helper (commands declare their own reads, see CLAUDE.md):
 * derives the simulated bonus status from a game's bonus events.
 */
export function bonusStatus(
  events: ReadonlyArray<{ readonly kind: string }>
): BonusStatus {
  if (events.some((event) => event.kind === 'bonus_claimed')) return 'claimed'
  if (events.some((event) => event.kind === 'bonus_offered')) return 'offered'
  return 'none'
}
