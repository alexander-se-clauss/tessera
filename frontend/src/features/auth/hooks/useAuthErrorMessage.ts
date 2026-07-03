import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'

type ApiMessage = {
  message?: string
}

export function useAuthErrorMessage() {
  const isAuthFailure = (error: unknown) => {
    if (typeof error !== 'object' || error === null || !('status' in error)) {
      return false
    }

    const queryError = error as FetchBaseQueryError
    return queryError.status === 401 || queryError.status === 403
  }

  const getMessage = (error: unknown) => {
    if (!error) {
      return 'Authentication failed.'
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
      const queryError = error as FetchBaseQueryError
      const data = queryError.data as ApiMessage | undefined
      return data?.message || 'Request failed.'
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const serializedError = error as SerializedError
      return serializedError.message || 'Authentication failed.'
    }

    if (error instanceof Error) {
      return error.message
    }

    return 'Authentication failed.'
  }

  return { getMessage, isAuthFailure }
}
