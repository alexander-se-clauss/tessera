export type UserView = {
  id: number
  username: string
  role: string
  createdAt: string
}

export type AuthRequest = {
  username: string
  password: string
  email?: string
}

export type AuthResponse = {
  token: string
  user: UserView
}

export type ApiError = {
  message?: string
}
