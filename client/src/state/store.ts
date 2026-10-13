import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { cqrsApi } from './cqrs-api'

export function makeStore() {
  return configureStore({
    reducer: { [cqrsApi.reducerPath]: cqrsApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(cqrsApi.middleware),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
