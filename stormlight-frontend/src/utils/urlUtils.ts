export const usernameToUrl = (username: string): string => {
  return username.trim().replace(/\s+/g, '-')
}

export const urlToUsername = (urlUsername: string): string => {
  return urlUsername.replace(/-/g, ' ')
}

export function normalizeDisplayUsername(name: string): string {
  if (!name) return name;
  return name
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}
