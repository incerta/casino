'use client'

import { useState, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from './store'

export function StoreProvider(props: { children: ReactNode }) {
  const [store] = useState(makeStore)

  return <Provider store={store}>{props.children}</Provider>
}
