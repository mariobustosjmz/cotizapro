import { describe, expect, it } from 'vitest'
import { aiBannerLevel } from './banner'

describe('aiBannerLevel', () => {
  it('avisa al propietario o administrador al 80 y al 100 %', () => {
    expect(aiBannerLevel({ percent: 79, remaining: 84 }, 'owner')).toBe('none')
    expect(aiBannerLevel({ percent: 80, remaining: 80 }, 'admin')).toBe('warning')
    expect(aiBannerLevel({ percent: 100, remaining: 0 }, 'owner')).toBe('exhausted')
  })

  it('no muestra avisos a miembros ni a lectores', () => {
    expect(aiBannerLevel({ percent: 100, remaining: 0 }, 'member')).toBe('none')
    expect(aiBannerLevel({ percent: 100, remaining: 0 }, 'viewer')).toBe('none')
  })
})
