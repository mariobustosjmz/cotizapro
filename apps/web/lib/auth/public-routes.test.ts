import { describe, expect, it } from 'vitest'
import { isPublicPath } from '@cotizapro/auth/public-routes'

describe('isPublicPath', () => {
  it.each(['/', '/login', '/signup', '/forgot-password', '/auth/reset-password', '/invite/abc123', '/p/megaglass', '/r/token', '/c/0123abcd', '/terminos', '/privacidad', '/onboarding'])(
    'permite %s sin sesión',
    (path) => expect(isPublicPath(path)).toBe(true),
  )

  it.each(['/dashboard', '/dashboard/quotes/new', '/invitex', '/pagos', '/forgot-passwordx', '/clientes'])('exige sesión en %s', (path) => {
    expect(isPublicPath(path)).toBe(false)
  })
})
