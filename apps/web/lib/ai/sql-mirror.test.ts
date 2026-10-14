import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLANS, PLAN_ORDER } from '@/lib/plans/catalog'
import { AI_DAILY_USER_CAP, AI_FEATURES, AI_FEATURE_ORDER } from './features'
import { AI_TIME_ZONE } from './period'

const SQL = readFileSync(path.resolve(__dirname, '../../supabase/migrations/043_ai_credits.sql'), 'utf8')

function functionBody(functionName: string): string {
  const start = SQL.indexOf(`FUNCTION public.${functionName}(`)
  return SQL.slice(SQL.indexOf('$$', start) + 2, SQL.indexOf('$$;', start))
}

function caseValues(functionName: string): Readonly<Record<string, number>> {
  return Object.fromEntries([...functionBody(functionName).matchAll(/WHEN '([a-z_]+)' THEN (\d+)/g)].map((m) => [m[1], Number(m[2])]))
}

function scalarBody(functionName: string): string {
  return functionBody(functionName).trim()
}

describe('espejo TS/SQL de los créditos de IA', () => {
  it('ai_monthly_allowance coincide con aiCreditsMonthly', () => {
    expect(caseValues('ai_monthly_allowance')).toEqual(Object.fromEntries(PLAN_ORDER.map((id) => [id, PLANS[id].aiCreditsMonthly])))
  })

  it('ai_feature_credits coincide con AI_FEATURES', () => {
    expect(caseValues('ai_feature_credits')).toEqual(Object.fromEntries(AI_FEATURE_ORDER.map((id) => [id, AI_FEATURES[id].credits])))
  })

  it('el tope diario es el mismo', () => {
    expect(scalarBody('ai_daily_user_cap')).toBe(`SELECT ${AI_DAILY_USER_CAP}`)
    expect(SQL).toContain('v_daily + p_credits > public.ai_daily_user_cap()')
  })

  it('la zona horaria del periodo es la misma y vive en un solo lugar', () => {
    expect(scalarBody('ai_time_zone')).toBe(`SELECT '${AI_TIME_ZONE}'::TEXT`)
    expect(SQL.split(`'${AI_TIME_ZONE}'`).length - 1).toBe(1)
  })

  it('el CHECK de feature acepta exactamente las funciones del catálogo', () => {
    const check = /feature TEXT NOT NULL CHECK \(feature IN \(([^)]+)\)\)/.exec(SQL)?.[1] ?? ''
    expect(check.split(',').map((s) => s.trim().replace(/'/g, ''))).toEqual([...AI_FEATURE_ORDER])
  })
})
