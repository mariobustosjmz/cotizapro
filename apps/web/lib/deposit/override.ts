export type DepositOverrideResult =
  | { readonly ok: true; readonly value: number | null }
  | { readonly ok: false; readonly error: string }

const INVALID: DepositOverrideResult = { ok: false, error: 'Usa un número entero de 0 a 100' }

/** Campo de anticipo de una cotización: vacío = usar el de la empresa (null). */
export function parseDepositOverride(raw: string): DepositOverrideResult {
  const text = raw.trim()
  if (text === '') return { ok: true, value: null }
  if (!/^\d{1,3}$/.test(text)) return INVALID
  const value = Number(text)
  return value <= 100 ? { ok: true, value } : INVALID
}
