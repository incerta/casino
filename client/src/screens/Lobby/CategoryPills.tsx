import Link from 'next/link'
import { CategoryIcon } from './CategoryIcon'
import { CATEGORIES, categoryHref, type CategoryId } from './categories'
import styles from './CategoryPills.module.css'

export function CategoryPills(props: { active: CategoryId | null }) {
  return (
    <nav className={styles.pills} aria-label="Game categories">
      {CATEGORIES.map((category) => (
        <Link
          key={category.id}
          href={categoryHref(category.id)}
          className={styles.pill}
          aria-current={props.active === category.id ? 'page' : undefined}
        >
          <CategoryIcon id={category.id} />
          {category.label}
        </Link>
      ))}
    </nav>
  )
}
