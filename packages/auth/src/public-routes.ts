/** Rutas accesibles sin sesión; cada una cubre también sus subrutas. */
export const PUBLIC_ROUTES: readonly string[] = [
  '/', '/login', '/signup', '/forgot-password', '/auth', '/onboarding', '/invite', '/terminos', '/privacidad', '/p', '/r',
]

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
