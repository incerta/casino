'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import styles from './HeroCarousel.module.css'

const AUTO_ADVANCE_MS = 6000

const SLIDES = [
  {
    id: 'chicken',
    eyebrow: 'New · Instant game',
    lines: ['Cross the road,', 'cash out in time'],
    text: 'Every lane raises the multiplier. Stop before the traffic does.',
    href: '/games/chicken-cross',
    glyph: '🐔',
    gradient: ['#3a1d0b', '#e8590c'],
  },
  {
    id: 'dice',
    eyebrow: 'New · Instant game',
    lines: ['Pick your odds,', 'roll the neon dice'],
    text: 'Slide the target, choose over or under, and see the payout before you roll.',
    href: '/games/neon-dice',
    glyph: '🎲',
    gradient: ['#160d3d', '#7755ff'],
  },
  {
    id: 'bonus',
    eyebrow: 'Demo bonus',
    lines: ['Play 2 rounds,', 'unlock a bonus'],
    text: 'Finish two rounds in any game to see the simulated bonus. It has no real-money value.',
    href: '/games/lucky-sevens',
    glyph: '🎁',
    gradient: ['#0b3318', '#2fbf4a'],
  },
]

export function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(
      () => setIndex((value) => (value + 1) % SLIDES.length),
      AUTO_ADVANCE_MS
    )
    return () => clearTimeout(timer)
  }, [paused, index])

  function go(step: 1 | -1) {
    setIndex((value) => (value + step + SLIDES.length) % SLIDES.length)
  }

  return (
    <section
      className={styles.carousel}
      aria-roledescription="carousel"
      aria-label="Featured games"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{ '--index': index } as React.CSSProperties}
        >
          {SLIDES.map((slide, slideIndex) => {
            const active = slideIndex === index
            return (
              <article
                key={slide.id}
                className={`${styles.slide} ${active ? styles.active : ''}`}
                style={{
                  background: `radial-gradient(circle at 78% 50%, ${slide.gradient[1]} 0%, ${slide.gradient[0]} 62%)`,
                }}
                aria-roledescription="slide"
                aria-label={`${slideIndex + 1} of ${SLIDES.length}`}
                aria-hidden={!active}
                inert={!active}
              >
                <div className={styles.copy}>
                  <span className="demo-badge">{slide.eyebrow}</span>
                  <h2 className={styles.headline}>
                    <span>{slide.lines[0]}</span>
                    <span className={styles.headlineAccent}>
                      {slide.lines[1]}
                    </span>
                  </h2>
                  <p className={styles.text}>{slide.text}</p>
                  <Link href={slide.href} className="btn btn-primary">
                    Try Now
                  </Link>
                </div>
                <span className={styles.art} aria-hidden>
                  {slide.glyph}
                </span>
              </article>
            )
          })}
        </div>
      </div>

      <div className={styles.controls}>
        <button aria-label="Previous slide" onClick={() => go(-1)}>
          <ChevronLeftIcon />
        </button>
        <span className={styles.counter} aria-live="polite">
          {index + 1}/{SLIDES.length}
        </span>
        <button aria-label="Next slide" onClick={() => go(1)}>
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  )
}
