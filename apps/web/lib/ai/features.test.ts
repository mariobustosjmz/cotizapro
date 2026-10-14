import { describe, expect, it } from 'vitest'
import { PLANS, PLAN_ORDER } from '@/lib/plans/catalog'
import { AI_DAILY_USER_CAP, AI_FEATURES, AI_FEATURE_ORDER, creditsLabel, isAiFeatureId } from './features'

describe('catálogo de funciones de IA', () => {
  it('cobra lo acordado por función', () => {
    expect(AI_FEATURE_ORDER.map((id) => [id, AI_FEATURES[id].credits])).toEqual([
      ['whatsapp_draft', 3],
      ['describe_item', 2],
      ['follow_up', 1],
      ['rewrite', 1],
      ['showcase_texts', 2],
    ])
  })

  it('usa temperatura 0.2 para extraer y 0.5 para redactar', () => {
    expect(AI_FEATURES.whatsapp_draft.temperature).toBe(0.2)
    for (const id of ['describe_item', 'follow_up', 'rewrite', 'showcase_texts'] as const) {
      expect(AI_FEATURES[id].temperature).toBe(0.5)
    }
  })

  it('limita la salida de la vitrina y de la descripción', () => {
    expect(AI_FEATURES.describe_item.maxOutputChars).toBe(300)
    expect(AI_FEATURES.showcase_texts.output).toBe('json')
  })

  it('reconoce solo identificadores conocidos', () => {
    expect(isAiFeatureId('rewrite')).toBe(true)
    expect(isAiFeatureId('precio_sugerido')).toBe(false)
  })

  it('aplica un tope diario de 40 créditos por usuario', () => {
    expect(AI_DAILY_USER_CAP).toBe(40)
  })

  it('escribe crédito en singular y plural', () => {
    expect(creditsLabel(1)).toBe('1 crédito')
    expect(creditsLabel(3)).toBe('3 créditos')
  })
})

describe('cupo mensual de IA por plan', () => {
  it('Gratis 25, Solo 150, Taller 400 y Empresa 1,200', () => {
    expect(PLAN_ORDER.map((id) => PLANS[id].aiCreditsMonthly)).toEqual([25, 150, 400, 1200])
  })
})
