'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogoMark, MenuIcon, SearchIcon } from '../icons'
import styles from './Header.module.css'

export function Header(props: {
  menuExpanded: boolean
  onToggleMenu: () => void
  onAccount: () => void
}) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <button
          className={styles.burger}
          aria-label="Toggle menu"
          aria-expanded={props.menuExpanded}
          onClick={props.onToggleMenu}
        >
          <MenuIcon />
        </button>
        <Link href="/" className={styles.logo} aria-label="Incerta home">
          <LogoMark />
          <span className={styles.logoText}>
            Incerta<span className={styles.logoAccent}>.demo</span>
          </span>
        </Link>
      </div>

      <Suspense fallback={<div className={styles.search} />}>
        <SearchField />
      </Suspense>

      <div className={styles.actions}>
        <button className="btn btn-outline" onClick={props.onAccount}>
          Login
        </button>
        <button className="btn btn-cta" onClick={props.onAccount}>
          Register
        </button>
      </div>
    </header>
  )
}

/** Writes `?q=` on the lobby, which filters the game list */
function SearchField() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)

  // Follow the URL when it changes elsewhere, e.g. a category link clears it
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    if (urlQuery !== query.trim()) setQuery(urlQuery)
  }

  function search(value: string) {
    const trimmed = value.trim()
    setQuery(value)
    setSyncedQuery(trimmed)
    router.replace(trimmed === '' ? '/' : `/?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form
      className={styles.search}
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        search(query)
      }}
    >
      <SearchIcon className={styles.searchIcon} />
      <input
        type="search"
        aria-label="Search games"
        placeholder="Game | Category"
        value={query}
        onChange={(event) => search(event.target.value)}
      />
    </form>
  )
}
