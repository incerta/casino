import styles from './Game.module.css'

export function BonusModal(props: { claiming: boolean; onClaim: () => void }) {
  return (
    <div className={styles.backdrop}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bonus-title"
      >
        <span className="demo-badge">Simulated · test environment</span>
        <div className={styles.modalIcon} aria-hidden>
          🎁
        </div>
        <h2 id="bonus-title" className={styles.modalTitle}>
          You&apos;ve won a bonus
        </h2>
        <p className={styles.modalText}>
          This bonus is part of the demo. It is simulated and has no real-money
          value.
        </p>
        <button
          className={styles.spin}
          disabled={props.claiming}
          onClick={props.onClaim}
          autoFocus
        >
          Claim Bonus
        </button>
      </div>
    </div>
  )
}
