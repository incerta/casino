import type { GameConfig } from '@/generated/client-api-types'

export type CategoryId = 'lobby' | 'new' | 'slots' | 'instant' | 'top'

export const CATEGORIES: {
  id: CategoryId
  label: string
  /** Section title on the lobby page, absent for the lobby itself */
  rowTitle?: string
  matches: (game: GameConfig) => boolean
}[] = [
  { id: 'lobby', label: 'Lobby', matches: () => true },
  {
    id: 'top',
    label: 'Top Games',
    rowTitle: 'Top games',
    matches: (game) => game.tags.includes('top'),
  },
  {
    id: 'new',
    label: 'New Games',
    rowTitle: 'New games',
    matches: (game) => game.tags.includes('new'),
  },
  {
    id: 'slots',
    label: 'Slots',
    rowTitle: 'Slots',
    matches: (game) => game.category === 'slots',
  },
  {
    id: 'instant',
    label: 'Instant',
    rowTitle: 'Instant games',
    matches: (game) => game.category === 'instant',
  },
]

export function parseCategory(value: string | null): CategoryId {
  return CATEGORIES.find((category) => category.id === value)?.id ?? 'lobby'
}

export function categoryHref(id: CategoryId) {
  return id === 'lobby' ? '/' : `/?category=${id}`
}

export function matchesSearch(game: GameConfig, query: string) {
  const needle = query.trim().toLowerCase()
  return [game.title, game.description, game.category, game.type].some((text) =>
    text.toLowerCase().includes(needle)
  )
}
