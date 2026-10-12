import { describe, expect, it } from 'vitest'
import { isWon, collectedSince, conversionFunnel, conversionRate, countByStatus, pendingBalance, responseRate, toStatusCounts } from './quote-stats'

const week = [
  { status: 'cobrado' }, { status: 'cobrado' }, { status: 'completado' }, { status: 'accepted' },
  { status: 'rejected' }, { status: 'sent' }, { status: 'draft' },
]

describe('countByStatus', () => {
  it('cuenta los nueve estados, incluidos instalación, completada y cobrada', () => {
    expect(countByStatus(week)).toEqual({ draft: 1, sent: 1, viewed: 0, accepted: 1, rejected: 1, expired: 0, en_instalacion: 0, completado: 1, cobrado: 2 })
  })

  it('ignora estados desconocidos', () => {
    expect(countByStatus([{ status: 'installed' }]).accepted).toBe(0)
  })
})

describe('tasas', () => {
  it('conversión: ganadas (aceptada en adelante) entre decididas', () => {
    expect(conversionRate(countByStatus(week))).toBe(80)
  })

  it('respuesta: las que el cliente contestó entre las enviadas', () => {
    expect(responseRate(countByStatus(week))).toBe(83.33)
  })

  it('sin cotizaciones decididas las tasas son cero', () => {
    expect(conversionRate(countByStatus([{ status: 'draft' }]))).toBe(0)
    expect(responseRate(countByStatus([]))).toBe(0)
  })
})

describe('conversionFunnel', () => {
  it('cada etapa incluye a las que ya avanzaron más', () => {
    expect(conversionFunnel(countByStatus(week), 7)).toEqual([
      { stage: 'Creadas', count: 7 },
      { stage: 'Enviadas', count: 6 },
      { stage: 'Vistas', count: 4 },
      { stage: 'Aceptadas', count: 4 },
      { stage: 'Cobradas', count: 2 },
    ])
  })
})

describe('collectedSince', () => {
  const payments = [
    { amount: '1647.20', payment_date: '2026-10-13' },
    { amount: 40542.31, payment_date: '2026-10-15' },
    { amount: '500', payment_date: '2026-09-30' },
  ]

  it('suma todos los pagos sin fecha de corte', () => {
    expect(collectedSince(payments)).toBe(42689.51)
  })

  it('suma solo los pagos desde la fecha indicada', () => {
    expect(collectedSince(payments, '2026-10-01')).toBe(42189.51)
  })
})

describe('pendingBalance', () => {
  it('es lo que falta por cobrar de cada cotización comprometida', () => {
    const quotes = [
      { id: 'torres', total: '10626.18', status: 'accepted' },
      { id: 'salinas', total: 81084.62, status: 'completado' },
      { id: 'andrea', total: 12550.27, status: 'cobrado' },
      { id: 'roberto', total: 6437.72, status: 'sent' },
    ]
    const payments = [
      { quote_id: 'torres', amount: 5313.09 },
      { quote_id: 'salinas', amount: '64867.70' },
      { quote_id: 'andrea', amount: 12550.27 },
    ]
    expect(pendingBalance(quotes, payments)).toBe(21530.01)
  })

  it('un sobrepago no resta saldo de otras cotizaciones', () => {
    expect(pendingBalance([{ id: 'a', total: 100, status: 'accepted' }, { id: 'b', total: 50, status: 'en_instalacion' }], [{ quote_id: 'a', amount: 150 }])).toBe(50)
  })
})

describe('toStatusCounts', () => {
  it('completa con cero los estados que la API no envía', () => {
    expect(toStatusCounts({ cobrado: 2, accepted: 1 })).toMatchObject({ cobrado: 2, accepted: 1, en_instalacion: 0, draft: 0 })
    expect(toStatusCounts(undefined).completado).toBe(0)
  })
})

describe('isWon', () => {
  it('aceptada y las etapas posteriores son venta ganada', () => {
    expect(['accepted', 'en_instalacion', 'completado', 'cobrado'].every(isWon)).toBe(true)
    expect(['draft', 'sent', 'viewed', 'rejected', 'expired'].some(isWon)).toBe(false)
  })
})
