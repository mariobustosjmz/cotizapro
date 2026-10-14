import { describe, expect, it } from 'vitest'
import { depositSettingsFromForm } from './settings-form'

function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.append(key, value)
  return data
}

describe('depositSettingsFromForm', () => {
  it('convierte el porcentaje y recorta los textos', () => {
    expect(depositSettingsFromForm(form({ deposit_percent: '30', deposit_instructions: '  CLABE 012 ', deposit_payment_url: ' https://mpago.la/x ' }))).toEqual({
      deposit_percent: 30, deposit_instructions: 'CLABE 012', deposit_payment_url: 'https://mpago.la/x',
    })
  })

  it('sin porcentaje usa 50 y los textos vacíos quedan en null', () => {
    expect(depositSettingsFromForm(form({ deposit_percent: '', deposit_instructions: '  ', deposit_payment_url: '' }))).toEqual({
      deposit_percent: 50, deposit_instructions: null, deposit_payment_url: null,
    })
  })
})
