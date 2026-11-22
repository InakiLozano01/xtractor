const DEFAULT_APP_URL = 'https://xtractor.inakilozano.com'

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || DEFAULT_APP_URL).replace(/\/$/, '')
}

export function appPath(path: string) {
  return `${appUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
