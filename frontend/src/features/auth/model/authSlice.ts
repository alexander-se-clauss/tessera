import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../app/store'
import { readStoredToken } from './authStorage'
import type { AuthResponse, UserView } from './types'

type AuthState = {
  token: string | null
  user: UserView | null
  status: 'anonymous' | 'restoring' | 'authenticated'
}

const storedToken = readStoredToken()

const initialState: AuthState = {
  token: storedToken,
  user: null,
  status: storedToken ? 'restoring' : 'anonymous',
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthResponse>) {
      state.token = action.payload.token
      state.user = action.payload.user
      state.status = 'authenticated'
    },
    setCurrentUser(state, action: PayloadAction<UserView>) {
      state.user = action.payload
      state.status = 'authenticated'
    },
    startSessionRestore(state) {
      if (state.token) {
        state.status = 'restoring'
      }
    },
    clearSession(state) {
      state.token = null
      state.user = null
      state.status = 'anonymous'
    },
  },
})

export const { clearSession, setCredentials, setCurrentUser, startSessionRestore } = authSlice.actions
export const authReducer = authSlice.reducer

export const selectAuthToken = (state: RootState) => state.auth.token
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAuthStatus = (state: RootState) => state.auth.status
