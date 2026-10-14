import { z } from 'zod'
import { phoneKey } from '@/lib/showcase/phone-match'
import { sanitizeText } from '@/lib/ai/sanitize'
import { normalizeItemMeasures, tryParseQuantity } from './measures'
import type { DraftClient, DraftExtraction, DraftItem } from './types'

const MAX_ITEMS = 15
const MAX_ITEM_NOTES = 200
const MAX_REVIEW_RAW = 40
const NATIONAL_PHONE_DIGITS = 10
const loose = z.union([z.string(), z.number()]).nullish()

/** Lo que el prompt pide al modelo. No hay campos de precio: si el modelo los manda, zod los descarta. */
export const rawExtractionSchema = z.object({
  cliente: z
    .object({ nombre: z.string().nullish(), telefono: loose, correo: z.string().nullish(), zona: z.string().nullish() })
    .nullish(),
  partidas: z
    .array(z.object({ concepto: z.string(), cantidad: loose, ancho: loose, alto: loose, notas: z.string().nullish() }))
    .nullish()
    .transform((items) => items ?? []),
  notas: z.string().nullish(),
})

export type RawExtraction = z.infer<typeof rawExtractionSchema>

function clip(value: string | null | undefined, max: number): string | null {
  return sanitizeText(value ?? '', max) || null
}

/** Solo 10 dígitos, o 52 / 521 antepuesto. Letras, extensiones, decimales u otra cantidad de dígitos no son un teléfono. */
function parsePhone(raw: string | number | null | undefined): string | null {
  let text = ''
  if (typeof raw === 'number') text = Number.isSafeInteger(raw) && raw > 0 ? String(raw) : ''
  else if (typeof raw === 'string' && /^[+\d\s().-]+$/.test(raw.slice(0, 40))) text = raw.slice(0, 40)
  const digits = text.replace(/\D/g, '')
  const valid =
    digits.length === NATIONAL_PHONE_DIGITS ||
    (digits.length === 12 && digits.startsWith('52')) ||
    (digits.length === 13 && digits.startsWith('521'))
  return valid ? phoneKey(digits) : null
}

function normalizeClient(raw: RawExtraction['cliente']): DraftClient {
  const email = clip(raw?.correo, 160)
  return {
    name: clip(raw?.nombre, 120),
    phone: parsePhone(raw?.telefono),
    email: email && z.email().safeParse(email).success ? email : null,
    zone: clip(raw?.zona, 80),
  }
}

function hasContent(raw: unknown): boolean {
  return typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '')
}

function reviewNote(label: string, raw: unknown): string | null {
  const shown = sanitizeText(String(raw).replace(/[«»]/g, ''), MAX_REVIEW_RAW)
  return shown ? `Revisar: ${label} «${shown}»` : null
}

function unreadNotes(raw: RawExtraction['partidas'][number], quantity: number | null, widthM: number | null, heightM: number | null): string[] {
  const notes = [
    hasContent(raw.cantidad) && quantity === null ? reviewNote('cantidad', raw.cantidad) : null,
    hasContent(raw.ancho) && widthM === null ? reviewNote('medida', raw.ancho) : null,
    hasContent(raw.alto) && heightM === null ? reviewNote('medida', raw.alto) : null,
  ]
  return notes.filter((note): note is string => note !== null)
}

function normalizeItem(raw: RawExtraction['partidas'][number]): DraftItem | null {
  const concept = clip(raw.concepto, 120)
  if (!concept) return null
  const quantity = tryParseQuantity(raw.cantidad)
  const { widthM, heightM } = normalizeItemMeasures(raw.ancho, raw.alto)
  const review = unreadNotes(raw, quantity, widthM, heightM).join('; ')
  const own = clip(raw.notas, Math.max(0, MAX_ITEM_NOTES - (review ? review.length + 2 : 0)))
  const notes = [own, review || null].filter((part): part is string => part !== null).join('; ')
  return { concept, quantity: quantity ?? 1, widthM, heightM, notes: notes ? notes.slice(0, MAX_ITEM_NOTES) : null }
}

export function normalizeExtraction(raw: RawExtraction): DraftExtraction {
  const items = raw.partidas.map(normalizeItem).filter((item): item is DraftItem => item !== null).slice(0, MAX_ITEMS)
  return { client: normalizeClient(raw.cliente), items, notes: clip(raw.notas, 500) }
}
