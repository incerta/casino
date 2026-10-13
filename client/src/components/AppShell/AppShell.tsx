'use client'

import { useState, useSyncExternalStore } from 'react'
import { DemoNotice } from './DemoNotice'
import { Footer } from './Footer'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { SupportBubble } from './SupportBubble'
import styles from './AppShell.module.css'

const DESKTOP_QUERY = '(min-width: 1024px)'

export type DemoNoticeTopic = 'account' | 'support'

/**
 * The casino frame around every page: header, sidebar, footer and the
 * support bubble. On desktop the burger collapses the sidebar to icons,
 * on mobile it opens the sidebar as a drawer.
 */
export function AppShell(props: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notice, setNotice] = useState<DemoNoticeTopic | null>(null)

  function toggleMenu() {
    if (isDesktop) {
      setCollapsed((value) => !value)
    } else {
      setDrawerOpen((value) => !value)
    }
  }

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
      <Header
        menuExpanded={isDesktop ? !collapsed : drawerOpen}
        onToggleMenu={toggleMenu}
        onAccount={() => setNotice('account')}
      />

      <Sidebar
        open={drawerOpen}
        collapsed={collapsed}
        onNavigate={() => setDrawerOpen(false)}
      />
      {drawerOpen && (
        <div
          className={styles.backdrop}
          aria-hidden
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className={styles.content}>
        {props.children}
        <Footer />
      </div>

      <SupportBubble onOpen={() => setNotice('support')} />

      {notice !== null && (
        <DemoNotice topic={notice} onClose={() => setNotice(null)} />
      )}
    </div>
  )
}

function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP_QUERY)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  )
}
