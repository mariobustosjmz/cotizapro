import type { RewriteContext } from '@/lib/validations/ai'

/** Largo máximo de la salida por contexto: debe caber en lo que el campo de destino permite guardar. */
export const REWRITE_OUTPUT_LIMITS: Readonly<Record<RewriteContext, number>> = {
  quote_notes: 2000,
  quote_terms: 2400,
  review_reply: 900,
  free: 2400,
}

export function exceedsRewriteLimit(text: string, maxChars: number): boolean {
  return text.length > maxChars
}
