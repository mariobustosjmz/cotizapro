import { describe, expect, it } from 'vitest'
import { draftMessageError, DRAFT_MESSAGE_MAX, isDraftMessageTooLong } from './draft-message'

describe('draftMessageError', () => {
  it('vacío pide pegar el mensaje completo', () => {
    expect(draftMessageError('   ')).toBe('Pega el mensaje completo del cliente')
  })

  it('menos de 10 caracteres reales no se manda', () => {
    expect(draftMessageError('  hola    ')).toBe('Pega el mensaje completo del cliente')
  })

  it('más de 4,000 caracteres', () => {
    expect(draftMessageError('a'.repeat(DRAFT_MESSAGE_MAX + 1))).toBe('Máximo 4,000 caracteres')
  })

  it('un mensaje válido no tiene error', () => {
    expect(draftMessageError('Hola, quiero cotizar un espejo de baño')).toBeNull()
    expect(draftMessageError('a'.repeat(DRAFT_MESSAGE_MAX))).toBeNull()
  })
})

describe('isDraftMessageTooLong', () => {
  it('solo cuenta el texto sin espacios de los extremos, como el esquema', () => {
    expect(isDraftMessageTooLong('a'.repeat(DRAFT_MESSAGE_MAX))).toBe(false)
    expect(isDraftMessageTooLong(`  ${'a'.repeat(DRAFT_MESSAGE_MAX)}  `)).toBe(false)
    expect(isDraftMessageTooLong('a'.repeat(DRAFT_MESSAGE_MAX + 1))).toBe(true)
  })
})
