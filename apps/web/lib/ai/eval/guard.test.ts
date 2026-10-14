import { describe, expect, it } from 'vitest'
import { assertEvalAllowed } from './guard'

describe('assertEvalAllowed', () => {
  it('permite correr fuera de producción', () => {
    expect(() => assertEvalAllowed({ NODE_ENV: 'development' }, [])).not.toThrow()
    expect(() => assertEvalAllowed({}, [])).not.toThrow()
  })

  it('se niega en producción sin la bandera explícita', () => {
    expect(() => assertEvalAllowed({ NODE_ENV: 'production' }, [])).toThrow(/--allow-production/)
  })

  it('permite producción con --allow-production', () => {
    expect(() => assertEvalAllowed({ NODE_ENV: 'production' }, ['--allow-production'])).not.toThrow()
  })
})
