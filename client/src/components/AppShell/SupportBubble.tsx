import { ChatIcon } from '../icons'
import styles from './SupportBubble.module.css'

export function SupportBubble(props: { onOpen: () => void }) {
  return (
    <button
      className={styles.bubble}
      aria-label="Support chat"
      onClick={props.onOpen}
    >
      <ChatIcon width={26} height={26} />
    </button>
  )
}
