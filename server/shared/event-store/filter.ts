import type { Filter } from './types'

const OPERATOR_KEYS = new Set([
  '$eq',
  '$ne',
  '$in',
  '$exists',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$all',
])

export function matchesFilter<T>(record: T, filter: Filter<T>): boolean {
  const asObject = filter as Record<string, unknown>

  if (isPlainObject(filter) && '$not' in asObject) {
    return !matchesFilter(record, asObject.$not as Filter<T>)
  }
  if (isPlainObject(filter) && '$or' in asObject) {
    return (asObject.$or as Filter<T>[]).some((f) => matchesFilter(record, f))
  }
  if (isPlainObject(filter) && '$and' in asObject) {
    return (asObject.$and as Filter<T>[]).every((f) => matchesFilter(record, f))
  }

  return Object.entries(asObject).every(([key, fieldFilter]) =>
    matchesField((record as Record<string, unknown>)[key], fieldFilter)
  )
}

function matchesField(value: unknown, fieldFilter: unknown): boolean {
  if (isPlainObject(fieldFilter) && '$not' in fieldFilter) {
    return !matchesField(value, fieldFilter.$not)
  }
  if (isPlainObject(fieldFilter) && '$or' in fieldFilter) {
    return (fieldFilter.$or as unknown[]).some((f) => matchesField(value, f))
  }
  if (isPlainObject(fieldFilter) && '$and' in fieldFilter) {
    return (fieldFilter.$and as unknown[]).every((f) => matchesField(value, f))
  }

  if (!isOperatorObject(fieldFilter)) {
    return deepEqual(value, fieldFilter)
  }

  return Object.entries(fieldFilter).every(([operator, operand]) => {
    switch (operator) {
      case '$eq':
        return deepEqual(value, operand)
      case '$ne':
        return !deepEqual(value, operand)
      case '$in':
        return (
          Array.isArray(operand) && operand.some((v) => deepEqual(value, v))
        )
      case '$exists':
        return (value !== undefined) === operand
      case '$gt':
        return typeof value === 'number' && value > (operand as number)
      case '$gte':
        return typeof value === 'number' && value >= (operand as number)
      case '$lt':
        return typeof value === 'number' && value < (operand as number)
      case '$lte':
        return typeof value === 'number' && value <= (operand as number)
      case '$all':
        return (
          Array.isArray(value) &&
          Array.isArray(operand) &&
          operand.every((a) => value.includes(a))
        )
      default:
        return true
    }
  })
}

function isOperatorObject(value: unknown): value is Record<string, unknown> {
  return (
    isPlainObject(value) &&
    Object.keys(value).some((key) => OPERATOR_KEYS.has(key))
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
  }
  return false
}
