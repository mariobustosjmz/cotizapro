import { DEFAULT_DEPOSIT_PERCENT } from './amount'

export interface DepositSettingsPayload {
  readonly deposit_percent: number
  readonly deposit_instructions: string | null
  readonly deposit_payment_url: string | null
}

function optionalText(form: FormData, key: string): string | null {
  const value = form.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** Un porcentaje inválido se manda tal cual (NaN viaja como null) para que la API lo rechace con su mensaje. */
export function depositSettingsFromForm(form: FormData): DepositSettingsPayload {
  const rawPercent = String(form.get('deposit_percent') ?? '').trim()
  return {
    deposit_percent: rawPercent === '' ? DEFAULT_DEPOSIT_PERCENT : Number(rawPercent),
    deposit_instructions: optionalText(form, 'deposit_instructions'),
    deposit_payment_url: optionalText(form, 'deposit_payment_url'),
  }
}
