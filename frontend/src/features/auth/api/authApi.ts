import { createApi } from '@reduxjs/toolkit/query/react'
import type { AuthRequest, AuthResponse, UserView } from '../model/types'
import { createApiBaseQuery } from '../../../app/api/apiBaseQuery'

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: createApiBaseQuery({ baseUrl: '/api/auth' }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, AuthRequest>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
    }),
    register: builder.mutation<AuthResponse, AuthRequest>({
      query: (body) => ({
        url: '/register',
        method: 'POST',
        body,
      }),
    }),
    getCurrentUser: builder.query<UserView, void>({
      query: () => '/me',
    }),
  }),
})

export const { useGetCurrentUserQuery, useLoginMutation, useRegisterMutation } = authApi
