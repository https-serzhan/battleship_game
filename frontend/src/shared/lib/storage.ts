const sessionTokenKey = 'battleship.sessionToken'

export const getSessionToken = (): string | null =>
  window.localStorage.getItem(sessionTokenKey)

export const setSessionToken = (token: string): void => {
  window.localStorage.setItem(sessionTokenKey, token)
}

export const clearSessionToken = (): void => {
  window.localStorage.removeItem(sessionTokenKey)
}
