import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { DEFAULT_DEPOSIT_PERCENT } from '@/lib/deposit/amount'

type FieldErrors = Readonly<Record<string, string>>

const ERROR_INPUT_CLASS = 'border-red-500 bg-red-50'

function FieldError({ message }: { readonly message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

interface DepositSettingsProps {
  readonly fieldErrors?: FieldErrors
  readonly initialPercent: number | null
  readonly initialInstructions: string | null
  readonly initialPaymentUrl: string | null
}

/** Campos del anticipo; viajan con el formulario de la empresa (mismo patrón que BrandSettings). */
export function DepositSettings({ initialPercent, initialInstructions, initialPaymentUrl, fieldErrors = {} }: DepositSettingsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <FormField label="Anticipo (%)" htmlFor="deposit_percent" required hint="Se pide al aceptar la cotización. Pon 0 si no pides anticipo.">
        <Input id="deposit_percent" name="deposit_percent" type="number" min="0" max="100" step="1" required defaultValue={initialPercent ?? DEFAULT_DEPOSIT_PERCENT} className={fieldErrors.deposit_percent ? ERROR_INPUT_CLASS : undefined} />
        <FieldError message={fieldErrors.deposit_percent} />
      </FormField>
      <FormField label="Liga de pago" htmlFor="deposit_payment_url" hint="Mercado Pago u otra. Tu cliente la abre con el botón «Pagar anticipo».">
        <Input id="deposit_payment_url" name="deposit_payment_url" type="url" maxLength={500} placeholder="https://mpago.la/..." defaultValue={initialPaymentUrl ?? ''} className={fieldErrors.deposit_payment_url ? ERROR_INPUT_CLASS : undefined} />
        <FieldError message={fieldErrors.deposit_payment_url} />
      </FormField>
      <FormField label="Instrucciones de pago" htmlFor="deposit_instructions" className="md:col-span-2" hint="Banco, CLABE y a nombre de quién. Hasta 500 caracteres.">
        <Textarea id="deposit_instructions" name="deposit_instructions" rows={3} maxLength={500} placeholder="Transferencia a BBVA, CLABE 0121 8000 1234 5678 90, a nombre de ..." defaultValue={initialInstructions ?? ''} className={fieldErrors.deposit_instructions ? ERROR_INPUT_CLASS : undefined} />
        <FieldError message={fieldErrors.deposit_instructions} />
      </FormField>
    </div>
  )
}
