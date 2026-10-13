import { describe, expect, it } from 'vitest'
import { buildChecklist, type ChecklistInput } from './checklist'

const empty: ChecklistInput = { hasLogo: false, services: 0, quotes: 0, pagePublished: false, teammates: 0, pendingInvites: 0, includedUsers: 1 }

describe('buildChecklist', () => {
  it('en una cuenta de una persona no pide invitar equipo', () => {
    const steps = buildChecklist(empty)
    expect(steps.map((s) => s.id)).toEqual(['brand', 'catalog', 'quote', 'page'])
    expect(steps.every((s) => !s.done)).toBe(true)
  })

  it('con plan de equipo agrega invitar y lo da por hecho con una invitación pendiente', () => {
    const steps = buildChecklist({ ...empty, includedUsers: 3, pendingInvites: 1 })
    expect(steps.at(-1)).toMatchObject({ id: 'team', done: true })
  })

  it('marca cada paso con su dato', () => {
    const steps = buildChecklist({ ...empty, hasLogo: true, services: 2, quotes: 1, pagePublished: true })
    expect(steps.every((s) => s.done)).toBe(true)
  })
})
