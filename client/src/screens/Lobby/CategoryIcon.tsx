import {
  BoltIcon,
  FlameIcon,
  GridIcon,
  SlotIcon,
  SparkleIcon,
} from '@/components/icons'
import type { CategoryId } from './categories'

export function CategoryIcon(props: { id: CategoryId }) {
  switch (props.id) {
    case 'lobby':
      return <GridIcon />
    case 'top':
      return <FlameIcon />
    case 'new':
      return <SparkleIcon />
    case 'slots':
      return <SlotIcon />
    case 'instant':
      return <BoltIcon />
    default: {
      const missed: never = props.id
      console.error('missed case:', missed)
      return null
    }
  }
}
