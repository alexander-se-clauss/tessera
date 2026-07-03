const TOKEN_KEY = 'tile.auth.token'

export function readStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function writeStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}
