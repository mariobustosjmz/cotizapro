const PREAMBLE_START =
  /^(?:¡\s*)?(?:(?:claro|por supuesto|desde luego|con gusto|perfecto|listo|entendido|ok|okay)(?=\s*[!,.:])|aqu[ií] (?:tienes|est[aá]n?|va|te dejo)|te comparto|a continuaci[oó]n)/i

const QUOTE_PAIRS: Readonly<Record<string, string>> = { '"': '"', '“': '”', '«': '»' }
const HOLD_CHARS = 160
const MAX_FILLER_WORDS = 3
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g
const EMPHASIS = /(^|[^\w*_])(\*\*|__)(\S(?:(?:(?!\2)[^\n])*?\S)?)\2(?!\w)/g
const LEAD_IN = /aqu[ií] (?:tienes|est[aá]n?)|a continuaci[oó]n|te comparto|te dejo|con gusto te/i

function dropLoneHighSurrogate(text: string): string {
  const last = text.charCodeAt(text.length - 1)
  return last >= 0xd800 && last <= 0xdbff ? text.slice(0, -1) : text
}

function cleanControl(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '')
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\wáéíóúñ]/i.test(w)).length
}

function stripOnePreamble(text: string): string {
  const trimmed = text.replace(/^\s+/, '')
  if (!PREAMBLE_START.test(trimmed)) return trimmed
  const match = /[:\n]|[.!?]+(?=\s|$)/.exec(trimmed)
  if (!match) return trimmed
  const clause = trimmed.slice(0, match.index)
  const leadsIn = match[0] === ':' || match[0] === '\n'
  const isFiller = countWords(clause) <= MAX_FILLER_WORDS || (leadsIn && LEAD_IN.test(clause))
  if (!isFiller) return trimmed
  return trimmed.slice(match.index + match[0].length).replace(/^\s+/, '')
}

export function stripPreamble(text: string): string {
  let current = text.replace(/^\s+/, '')
  for (let i = 0; i < 3; i += 1) {
    const next = stripOnePreamble(current)
    if (next === current) return current
    current = next
  }
  return current
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[a-z]*\n?/gi, '')
    .replace(EMPHASIS, '$1$3')
    .replace(/`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
}

export function stripWrappingQuotes(text: string): string {
  const trimmed = text.trim()
  const close = QUOTE_PAIRS[trimmed.charAt(0)]
  return close && trimmed.length > 1 && trimmed.endsWith(close) ? trimmed.slice(1, -1).trim() : trimmed
}

export function truncateAt(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const slice = dropLoneHighSurrogate(text.slice(0, maxChars))
  const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.\n'))
  if (sentenceEnd >= maxChars * 0.6) return slice.slice(0, sentenceEnd + 1).trim()
  const space = slice.lastIndexOf(' ')
  return (space > 0 ? slice.slice(0, space) : slice).trim()
}

export function sanitizeText(raw: string, maxChars: number): string {
  if (typeof raw !== 'string') return ''
  const cleaned = stripWrappingQuotes(stripMarkdown(stripPreamble(cleanControl(raw)))).replace(/\n{3,}/g, '\n\n').trim()
  return truncateAt(cleaned, maxChars)
}

export interface StreamSanitizer {
  push(delta: string): string
  end(): string
}

/** Versión aproximada para mostrar en vivo; el texto final siempre se reemplaza con sanitizeText(). */
export function createStreamSanitizer(maxChars: number): StreamSanitizer {
  let pending = ''
  let released = false
  let emitted = 0

  const take = (text: string): string => {
    const base = emitted === 0 ? text.replace(/^\s+/, '') : text
    const out = dropLoneHighSurrogate(stripMarkdown(base).slice(0, Math.max(maxChars - emitted, 0)))
    emitted += out.length
    return out
  }

  return {
    push(delta: string): string {
      if (released) return take(cleanControl(delta))
      pending += cleanControl(delta)
      if (!pending.includes('\n') && pending.length < HOLD_CHARS) return ''
      released = true
      return take(stripPreamble(pending))
    },
    end(): string {
      if (released) return ''
      released = true
      return take(stripPreamble(pending))
    },
  }
}
