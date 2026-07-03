import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { RootState } from '../store'
import { clearSession } from '../../features/auth/model/authSlice'
import { clearStoredToken } from '../../features/auth/model/authStorage'
import { clearProjectSelection } from '../../features/editor/model/editorSlice'

type ApiBaseQueryOptions = {
  baseUrl: string
}

export function createApiBaseQuery({ baseUrl }: ApiBaseQueryOptions): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token

      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }

      return headers
    },
  })

  return async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions)

    if (result.error && (result.error.status === 401 || result.error.status === 403)) {
      clearStoredToken()
      api.dispatch(clearSession())
      api.dispatch(clearProjectSelection())
    }

    return result
  }
}
