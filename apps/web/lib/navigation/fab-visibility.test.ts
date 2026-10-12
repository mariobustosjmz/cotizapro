import { describe, expect, it } from 'vitest'
import { shouldShowFab } from './fab-visibility'

describe('shouldShowFab', () => {
  it.each(['/dashboard', '/dashboard/quotes', '/dashboard/clients', '/dashboard/calendar', '/dashboard/analytics', '/dashboard/quotes/'])(
    'se muestra en la sección %s',
    (path) => expect(shouldShowFab(path)).toBe(true),
  )

  it.each([
    '/dashboard/quotes/new',
    '/dashboard/quotes/0b7c2f0e-1d2a-4c1b-9d2e-0a1b2c3d4e5f',
    '/dashboard/quotes/0b7c2f0e-1d2a-4c1b-9d2e-0a1b2c3d4e5f/edit',
    '/dashboard/calendar/new',
    '/dashboard/team/invite',
    '/dashboard/settings/custom-fields/new',
  ])('se oculta en formularios y detalles: %s', (path) => expect(shouldShowFab(path)).toBe(false))
})
