'use client'

import Link from 'next/link'
import { cqrsApi } from '@/state/cqrs-api'
import styles from './Lobby.module.css'

export function Lobby() {
  const query = cqrsApi.useGamesQuery({})

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Incerta Casino</h1>
        <p className={styles.subtitle}>
          Try our games before registering.{' '}
          <span className="demo-badge">Demo · simulated outcomes</span>
        </p>
      </header>

      {renderGames()}
    </main>
  )

  function renderGames() {
    if (query.isLoading || query.isUninitialized) {
      return <p className={styles.status}>Loading games…</p>
    }

    if (query.isError) {
      return (
        <div className={styles.status}>
          <p>Network error: {query.error?.message ?? 'Unknown error'}</p>
          <button onClick={() => query.refetch()}>Reload</button>
        </div>
      )
    }

    return (
      <ul className={styles.grid}>
        {query.data.data.map((game) => (
          <li key={game.id}>
            <Link href={`/games/${game.id}`} className={styles.card}>
              <div className={styles.cardReels} aria-hidden>
                {game.symbols.slice(0, game.reelCount).map((symbol) => (
                  <span key={symbol.id}>{symbol.glyph}</span>
                ))}
              </div>
              <h2 className={styles.cardTitle}>{game.title}</h2>
              <p className={styles.cardDescription}>{game.description}</p>
              <span className={styles.cardCta}>Play demo</span>
            </Link>
          </li>
        ))}
      </ul>
    )
  }
}
