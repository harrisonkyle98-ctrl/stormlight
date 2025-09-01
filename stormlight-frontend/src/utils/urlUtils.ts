export const usernameToUrl = (username: string): string => {
  return username.trim().replace(/\s+/g, '-')
}

export const urlToUsername = (urlUsername: string): string => {
  return urlUsername.replace(/-/g, ' ')
}
