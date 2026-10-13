import { LogoMark } from '../icons'
import styles from './Footer.module.css'

/** Visual only: the columns mirror a real casino footer but link nowhere */
const COLUMNS = [
  { title: 'Casino', items: ['Lobby', 'Slots', 'Instant games'] },
  { title: 'About', items: ['Responsible gaming', 'Fair play', 'Terms'] },
  { title: 'Help', items: ['FAQ', 'Contact', 'Privacy'] },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <LogoMark />
          <p>
            Incerta is a demo casino interface built for testing. No accounts,
            no payments, no prizes.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title} className={styles.column}>
            <h2>{column.title}</h2>
            <ul>
              {column.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className={styles.legal}>
        <span className={styles.age}>18+</span> Demo environment · Simulated
        outcomes · No real-money value
      </p>
    </footer>
  )
}
