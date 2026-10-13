'use client'

import { useEffect } from 'react'
import { CloseIcon } from '../icons'
import type { DemoNoticeTopic } from './AppShell'
import styles from './DemoNotice.module.css'

const COPY: Record<DemoNoticeTopic, { title: string; text: string }> = {
  account: {
    title: 'Demo only, no accounts',
    text: 'This site is a test environment. There is no sign-up, login, deposit or withdrawal. Every game runs on simulated demo credits with no real-money value.',
  },
  support: {
    title: 'Demo only, no live support',
    text: 'This site is a test environment, so there is no support chat. Games use simulated outcomes and demo credits with no real-money value.',
  },
}

export function DemoNotice(props: {
  topic: DemoNoticeTopic
  onClose: () => void
}) {
  const { onClose } = props
  const copy = COPY[props.topic]

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-notice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className={styles.close}
          aria-label="Close"
          onClick={props.onClose}
        >
          <CloseIcon />
        </button>
        <span className="demo-badge">Test environment</span>
        <h2 id="demo-notice-title" className={styles.title}>
          {copy.title}
        </h2>
        <p className={styles.text}>{copy.text}</p>
        <button className="btn btn-primary" onClick={props.onClose} autoFocus>
          Got it
        </button>
      </div>
    </div>
  )
}
