'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import type { GameConfig } from '@/generated/client-api-types'
import { CategoryIcon } from './CategoryIcon'
import { categoryHref, type CategoryId } from './categories'
import { GameTile } from './GameTile'
import styles from './GameRow.module.css'

export function GameRow(props: {
  category: CategoryId
  title: string
  games: GameConfig[]
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const headingId = `row-${props.category}`

  function scrollBy(direction: 1 | -1) {
    const list = listRef.current
    if (list === null) return
    list.scrollBy({
      left: direction * list.clientWidth * 0.8,
      behavior: 'smooth',
    })
  }

  return (
    <section className={styles.row} aria-labelledby={headingId}>
      <header className={styles.header}>
        <span className={`${styles.badge} ${styles[props.category]}`}>
          <CategoryIcon id={props.category} />
        </span>
        <h2 id={headingId} className={styles.title}>
          {props.title}
        </h2>
        <Link
          href={categoryHref(props.category)}
          className={styles.viewAll}
          aria-label={`View all ${props.title}`}
        >
          View All
        </Link>
        <button
          className={styles.arrow}
          aria-label={`Scroll ${props.title} left`}
          onClick={() => scrollBy(-1)}
        >
          <ChevronLeftIcon />
        </button>
        <button
          className={styles.arrow}
          aria-label={`Scroll ${props.title} right`}
          onClick={() => scrollBy(1)}
        >
          <ChevronRightIcon />
        </button>
      </header>

      <ul ref={listRef} className={styles.list}>
        {props.games.map((game) => (
          <li key={game.id}>
            <GameTile game={game} />
          </li>
        ))}
      </ul>
    </section>
  )
}
