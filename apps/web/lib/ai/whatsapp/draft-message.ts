import { whatsappDraftSchema } from '@/lib/validations/ai'

export const DRAFT_MESSAGE_MAX = 4000

/** Mismo esquema que la ruta: el error se muestra junto al campo antes de gastar créditos. */
export function draftMessageError(message: string): string | null {
  const parsed = whatsappDraftSchema.safeParse({ message })
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? 'Pega el mensaje completo del cliente')
}

/** El esquema recorta espacios antes de medir: aquí igual, para no bloquear un mensaje que la ruta sí acepta. */
export function isDraftMessageTooLong(message: string): boolean {
  return message.trim().length > DRAFT_MESSAGE_MAX
}
