'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { cqrsApi } from '@/state/cqrs-api'
import type { GameConfig } from '@/generated/client-api-types'
import { CATEGORIES, matchesSearch, parseCategory } from './categories'
import { CategoryPills } from './CategoryPills'
import { GameRow } from './GameRow'
import { GameTile } from './GameTile'
import { HeroCarousel } from './HeroCarousel'
import styles from './Lobby.module.css'

export function Lobby() {
  return (
    <main className={styles.page}>
      <h1 className="visually-hidden">Incerta Casino</h1>
      <HeroCarousel />
      <p className={styles.intro}>
        Try every game before registering.{' '}
        <span className="demo-badge">Demo · simulated outcomes</span>
      </p>
      <Suspense fallback={<p className={styles.status}>Loading games…</p>}>
        <LobbyGames />
      </Suspense>
    </main>
  )
}

function LobbyGames() {
  const query = cqrsApi.useGamesQuery({})
  const searchParams = useSearchParams()
  const search = searchParams.get('q')?.trim() ?? ''
  const categoryId = parseCategory(searchParams.get('category'))

  return (
    <>
      <CategoryPills active={search === '' ? categoryId : null} />
      {renderGames()}
    </>
  )

  function renderGames() {
    if (query.isLoading || query.isUninitialized) {
      return <p className={styles.status}>Loading games…</p>
    }

    if (query.isError) {
      return (
        <div className={styles.status}>
          <p>Network error: {query.error?.message ?? 'Unknown error'}</p>
          <button className="btn" onClick={() => query.refetch()}>
            Reload
          </button>
        </div>
      )
    }

    const games = query.data.data

    if (search !== '') {
      return (
        <GameGrid
          title={`Results for “${search}”`}
          games={games.filter((game) => matchesSearch(game, search))}
        />
      )
    }

    const category = CATEGORIES.find(({ id }) => id === categoryId)

    if (category !== undefined && category.id !== 'lobby') {
      return (
        <GameGrid
          title={category.label}
          games={games.filter(category.matches)}
        />
      )
    }

    return CATEGORIES.map(
      (row) =>
        row.rowTitle !== undefined && (
          <GameRow
            key={row.id}
            category={row.id}
            title={row.rowTitle}
            games={games.filter(row.matches)}
          />
        )
    )
  }
}

function GameGrid(props: { title: string; games: GameConfig[] }) {
  return (
    <section className={styles.results} aria-labelledby="results-title">
      <h2 id="results-title" className={styles.resultsTitle}>
        {props.title}{' '}
        <span className={styles.count}>
          {props.games.length} {props.games.length === 1 ? 'game' : 'games'}
        </span>
      </h2>
      {props.games.length === 0 ? (
        <p className={styles.status}>No demo games match your search.</p>
      ) : (
        <ul className={styles.grid}>
          {props.games.map((game) => (
            <li key={game.id}>
              <GameTile game={game} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
