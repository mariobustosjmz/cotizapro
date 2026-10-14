import { describe, expect, it } from 'vitest'
import { adminGrantSchema, describeItemSchema, followUpSchema, rewriteSchema, whatsappDraftSchema } from './ai'

describe('validaciones de IA', () => {
  it('limita el largo de cada entrada', () => {
    expect(describeItemSchema.safeParse({ description: 'Cancel' }).success).toBe(true)
    expect(describeItemSchema.safeParse({ description: 'ab' }).success).toBe(false)
    expect(describeItemSchema.safeParse({ description: 'x'.repeat(301) }).success).toBe(false)
    expect(rewriteSchema.safeParse({ text: 'x'.repeat(2001), mode: 'polish', context: 'free' }).success).toBe(false)
    expect(whatsappDraftSchema.safeParse({ message: 'hola' }).success).toBe(false)
    expect(whatsappDraftSchema.safeParse({ message: 'x'.repeat(4001) }).success).toBe(false)
  })

  it('limita el nombre del servicio y acepta nulo', () => {
    expect(describeItemSchema.safeParse({ description: 'Cancel', serviceName: 'x'.repeat(200) }).success).toBe(true)
    expect(describeItemSchema.safeParse({ description: 'Cancel', serviceName: 'x'.repeat(201) }).success).toBe(false)
    expect(describeItemSchema.safeParse({ description: 'Cancel', serviceName: null }).success).toBe(true)
  })

  it('descarta llaves desconocidas, como un precio', () => {
    const parsed = describeItemSchema.parse({ description: 'Cancel', price: 1 })
    expect(parsed).not.toHaveProperty('price')
  })

  it('acepta los ids de la base demo', () => {
    expect(followUpSchema.safeParse({ quoteId: '00000000-0000-0000-00c0-000000000101' }).success).toBe(true)
    expect(followUpSchema.safeParse({ quoteId: 'no-es-id' }).success).toBe(false)
  })

  it('rechaza modos, contextos y fuentes desconocidos', () => {
    expect(rewriteSchema.safeParse({ text: 'Anticipo del 50 %', mode: 'poema', context: 'free' }).success).toBe(false)
    expect(rewriteSchema.safeParse({ text: 'Anticipo del 50 %', mode: 'polish', context: 'otro' }).success).toBe(false)
    expect(adminGrantSchema.safeParse({ organizationId: '00000000-0000-0000-00c0-000000000001', credits: 200, source: 'regalo' }).success).toBe(false)
    expect(adminGrantSchema.safeParse({ organizationId: '00000000-0000-0000-00c0-000000000001', credits: 200, source: 'pack' }).success).toBe(true)
  })

  it('da mensajes en español cuando falta un campo o tiene otro tipo', () => {
    const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message
    expect(msg(describeItemSchema.safeParse({}))).toBe('Escribe la descripción')
    expect(msg(describeItemSchema.safeParse({ description: 5 }))).toBe('Escribe la descripción')
    expect(msg(rewriteSchema.safeParse({ text: 'hola mundo', context: 'free' }))).toBe('Elige cómo mejorar el texto')
    expect(msg(whatsappDraftSchema.safeParse({}))).toBe('Pega el mensaje del cliente')
    expect(msg(followUpSchema.safeParse({ quoteId: 'x' }))).toBe('Cotización no válida')
    const base = { organizationId: '00000000-0000-0000-00c0-000000000001', credits: 200, source: 'pack' }
    expect(msg(adminGrantSchema.safeParse({ ...base, credits: 0 }))).toBe('Los créditos deben ser entre 1 y 100,000')
    expect(msg(adminGrantSchema.safeParse({ ...base, credits: 1.5 }))).toBe('Los créditos deben ser un número entero')
    expect(msg(adminGrantSchema.safeParse({ ...base, source: 'x' }))).toBe('Elige el origen: paquete o cortesía')
    expect(msg(adminGrantSchema.safeParse({ ...base, reference: 'x'.repeat(201) }))).toBe('La referencia admite máximo 200 caracteres')
    expect(msg(adminGrantSchema.safeParse({ ...base, organizationId: 'x' }))).toBe('Empresa no válida')
  })
})
