import type { Result } from './types'

const EPSILON = 1e-9

export function toCents(pesos: number): number {
  return Math.round(Number((pesos * 100).toFixed(6)))
}

export function roundHalfUp(value: number): number {
  return Math.round(Number(value.toFixed(6)))
}

export function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

export function ceilToStep(value: number, step: number): number {
  return round4(Math.ceil(value / step - EPSILON) * step)
}

export function ceilCount(value: number, every: number): number {
  return Math.ceil(value / every - EPSILON)
}

export function lengthToMeters(value: number, unit: 'mm' | 'cm' | 'm'): number {
  if (unit === 'mm') return value / 1000
  if (unit === 'cm') return value / 100
  return value
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function fail<T>(...errors: string[]): Result<T> {
  return { ok: false, errors }
}
