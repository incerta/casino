import Link from 'next/link'
import type { GameConfig } from '@/generated/client-api-types'
import styles from './GameTile.module.css'

export function GameTile(props: { game: GameConfig }) {
  const { game } = props
  const [from, to] = game.art.gradient

  return (
    <Link
      href={`/games/${game.id}`}
      className={styles.tile}
      style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
      aria-label={`Play ${game.title} demo`}
    >
      <span className={styles.badges}>
        <span className={styles.demo}>Demo</span>
        {game.tags.includes('new') && <span className={styles.new}>New</span>}
      </span>
      <span className={styles.glyph} aria-hidden>
        {game.art.glyph}
      </span>
      <span className={styles.info}>
        <h3 className={styles.title}>{game.title}</h3>
        <span className={styles.kind}>
          {game.category === 'slots' ? 'Slot' : 'Instant'}
        </span>
      </span>
      <span className={styles.overlay} aria-hidden>
        <span className="btn btn-primary">Play demo</span>
      </span>
    </Link>
  )
}
