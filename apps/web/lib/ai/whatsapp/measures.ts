export type MeasureUnit = 'm' | 'cm' | 'mm'

export interface ParsedMeasure {
  readonly value: number
  readonly unit: MeasureUnit | null
}

const MEASURE = /^(\d+(?:[.,]\d+)?)\s*([a-z]*)\.?$/
const UNIT_ALIASES: Readonly<Record<string, MeasureUnit>> = {
  mm: 'mm', mms: 'mm', milimetro: 'mm', milimetros: 'mm',
  cm: 'cm', cms: 'cm', centimetro: 'cm', centimetros: 'cm',
  m: 'm', mt: 'm', mts: 'm', metro: 'm', metros: 'm',
}
const MIN_METERS = 0.05
const MAX_METERS = 20
const MAX_QUANTITY = 500
const MAX_RAW_CHARS = 40
const MAX_ASPECT_RATIO = 15

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/** Áreas ("m2", "metros cuadrados"), rangos y unidades desconocidas no son una medida lineal: devuelven null. */
export function parseMeasure(raw: unknown): ParsedMeasure | null {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? { value: raw, unit: null } : null
  if (typeof raw !== 'string') return null
  const match = MEASURE.exec(stripAccents(raw.slice(0, MAX_RAW_CHARS)))
  if (!match || !match[1]) return null
  const value = Number(match[1].replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) return null
  const unitText = match[2] ?? ''
  if (!unitText) return { value, unit: null }
  const unit = UNIT_ALIASES[unitText]
  return unit ? { value, unit } : null
}

export function inferUnit(value: number): MeasureUnit {
  if (value <= 10) return 'm'
  if (value <= 400) return 'cm'
  return 'mm'
}

export function toMeters(value: number, unit: MeasureUnit): number | null {
  const meters = unit === 'm' ? value : unit === 'cm' ? value / 100 : value / 1000
  if (!Number.isFinite(meters) || meters < MIN_METERS || meters > MAX_METERS) return null
  return Math.round(meters * 1000) / 1000
}

/** Sin unidad: toma la de su pareja si da una medida razonable; si no, la deduce por el tamaño del número. */
export function resolveUnit(measure: ParsedMeasure, partner: ParsedMeasure | null): MeasureUnit {
  if (measure.unit) return measure.unit
  if (partner?.unit && toMeters(measure.value, partner.unit) !== null) return partner.unit
  return inferUnit(measure.value)
}

function measureToMeters(measure: ParsedMeasure | null, unit: MeasureUnit | null, partner: ParsedMeasure | null): number | null {
  if (!measure) return null
  return toMeters(measure.value, unit ?? resolveUnit(measure, partner))
}

/** Dos números enteros sin unidad se leen con la misma unidad: ambos >= 10 son cm; ambos < 10 son m. */
function sharedUnit(w: ParsedMeasure | null, h: ParsedMeasure | null): MeasureUnit | null {
  if (!w || !h || w.unit || h.unit) return null
  if (!Number.isInteger(w.value) || !Number.isInteger(h.value)) return null
  if (w.value >= 10 && h.value >= 10) return 'cm'
  return w.value < 10 && h.value < 10 ? 'm' : null
}

function isImplausibleRatio(widthM: number | null, heightM: number | null): boolean {
  if (widthM === null || heightM === null) return false
  return Math.max(widthM, heightM) / Math.min(widthM, heightM) > MAX_ASPECT_RATIO
}

export function normalizeItemMeasures(width: unknown, height: unknown): { readonly widthM: number | null; readonly heightM: number | null } {
  const w = parseMeasure(width)
  const h = parseMeasure(height)
  const unit = sharedUnit(w, h)
  const widthM = measureToMeters(w, unit, h)
  const heightM = measureToMeters(h, unit, w)
  const inferred = w?.unit === null || h?.unit === null
  return inferred && isImplausibleRatio(widthM, heightM) ? { widthM: null, heightM: null } : { widthM, heightM }
}

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20,
  par: 2, 'un par': 2, docena: 12, 'una docena': 12, 'media docena': 6,
}
const WORD_KEYS: readonly string[] = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length)
const TRAILING_PUNCTUATION = /[.,;!]+$/
const RANGE_SEPARATOR = /\s+(?:a|o)\s+|\s*-\s*/
const NUMBER_TOKEN = /^(\d[\d.,]*)(.*)$/
const LETTERS_ONLY_TAIL = /^[\sa-z.]*$/

/** "1,200" y "1.200" son miles; "2,5" y "2.5" son decimales. Cualquier otra forma no es un número. */
function parseNumberToken(token: string): number {
  if (/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(token)) return Number(token.replace(/,/g, ''))
  if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(token)) return Number(token.replace(/\./g, ''))
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token)
  if (/^\d+,\d+$/.test(token)) return Number(token.replace(',', '.'))
  return NaN
}

function quantityFromText(text: string): number {
  const numeric = NUMBER_TOKEN.exec(text)
  if (numeric) {
    const tail = numeric[2] ?? ''
    return LETTERS_ONLY_TAIL.test(tail) ? parseNumberToken(numeric[1] ?? '') : NaN
  }
  const key = WORD_KEYS.find((word) => text === word || text.startsWith(`${word} `))
  return key ? NUMBER_WORDS[key] ?? NaN : NaN
}

/** Cantidad entendida del texto o número; null si no se pudo leer. En rangos toma el primer valor; tope 500. */
export function tryParseQuantity(raw: unknown): number | null {
  let value = NaN
  if (typeof raw === 'number') value = Number.isFinite(raw) ? raw : NaN
  else if (typeof raw === 'string') {
    const first = stripAccents(raw.slice(0, MAX_RAW_CHARS)).split(RANGE_SEPARATOR)[0] ?? ''
    value = quantityFromText(first.replace(TRAILING_PUNCTUATION, ''))
  }
  if (Number.isNaN(value) || value <= 0) return null
  const rounded = Math.min(Math.round(value * 100) / 100, MAX_QUANTITY)
  return rounded > 0 ? rounded : null
}

/** Cantidad de la partida: 1 si no se entiende. */
export function parseQuantity(raw: unknown): number {
  return tryParseQuantity(raw) ?? 1
}
