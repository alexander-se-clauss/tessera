import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { authReducer } from '../features/auth/model/authSlice'
import { editorReducer } from '../features/editor/model/editorSlice'
import { recentProjectsReducer } from '../features/editor/model/recentProjectsSlice'
import { authApi } from '../features/auth/api/authApi'
import { editorApi } from '../features/editor/api/editorApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    editor: editorReducer,
    recentProjects: recentProjectsReducer,
    [authApi.reducerPath]: authApi.reducer,
    [editorApi.reducerPath]: editorApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authApi.middleware, editorApi.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
