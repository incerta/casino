'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AtIcon,
  BallIcon,
  BoltIcon,
  CardsIcon,
  ChatIcon,
  ChevronDownIcon,
  DiamondIcon,
  GiftIcon,
  GlobeIcon,
  GridIcon,
  HomeIcon,
  SendIcon,
  SlotIcon,
  TargetIcon,
  TrophyIcon,
  UsersIcon,
} from '../icons'
import styles from './Sidebar.module.css'

const CASINO_LINKS = [
  { href: '/', label: 'Lobby', Icon: GridIcon },
  { href: '/?category=slots', label: 'Slots', Icon: SlotIcon },
  { href: '/?category=instant', label: 'Instant games', Icon: BoltIcon },
]

/** Visual only: shown like the real site, but not part of the demo */
const SOON_ITEMS = [
  { label: 'Sports', Icon: BallIcon },
  { label: 'Promotions', Icon: GiftIcon },
  { label: 'Loyalty', Icon: DiamondIcon },
  { label: 'Missions', Icon: TargetIcon },
  { label: 'Tournaments', Icon: TrophyIcon },
]

export function Sidebar(props: {
  open: boolean
  collapsed: boolean
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const [casinoOpen, setCasinoOpen] = useState(true)

  return (
    <aside
      className={`${styles.sidebar} ${props.open ? styles.open : ''} ${
        props.collapsed ? styles.collapsed : ''
      }`}
      aria-label="Main menu"
    >
      <nav className={styles.nav}>
        <Link
          href="/"
          className={styles.item}
          title="Home"
          aria-current={pathname === '/' ? 'page' : undefined}
          onClick={props.onNavigate}
        >
          <HomeIcon />
          <span className={styles.label}>Home</span>
        </Link>

        <button
          className={styles.item}
          title="Casino"
          aria-expanded={casinoOpen}
          onClick={() => setCasinoOpen((value) => !value)}
        >
          <CardsIcon />
          <span className={styles.label}>Casino</span>
          <ChevronDownIcon
            className={`${styles.chevron} ${casinoOpen ? styles.chevronOpen : ''}`}
          />
        </button>
        {casinoOpen && (
          <ul className={styles.group}>
            {CASINO_LINKS.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={styles.subItem}
                  title={label}
                  onClick={props.onNavigate}
                >
                  <Icon />
                  <span className={styles.label}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {SOON_ITEMS.map(({ label, Icon }) => (
          <button
            key={label}
            className={styles.item}
            title={`${label} (soon)`}
            disabled
          >
            <Icon />
            <span className={styles.label}>{label}</span>
            <span className={styles.soon}>Soon</span>
          </button>
        ))}
      </nav>

      <div className={styles.bottom}>
        <button className={styles.item} disabled aria-label="Language: English">
          <GlobeIcon />
          <span className={styles.label}>English</span>
          <ChevronDownIcon className={styles.chevron} />
        </button>
        <button className={styles.item} disabled>
          <ChatIcon />
          <span className={styles.label}>Support</span>
          <span className={styles.soon}>Soon</span>
        </button>
        <div className={styles.socials}>
          <button disabled aria-label="Social link (soon)">
            <AtIcon />
          </button>
          <button disabled aria-label="Community link (soon)">
            <UsersIcon />
          </button>
          <button disabled aria-label="Channel link (soon)">
            <SendIcon />
          </button>
        </div>
      </div>
    </aside>
  )
}
