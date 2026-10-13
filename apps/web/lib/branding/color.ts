import type { BrandPalette } from './types'

export const DEFAULT_BRAND_COLOR = '#F97316'
const HEX = /^#[0-9a-f]{6}$/i
const DARK_INK = '#111827'
const WHITE = '#FFFFFF'
const LIGHT_BG = '#FFFFFF'
const DARK_BG = '#0F1117'
const MIN_TEXT_CONTRAST = 4.5

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value)
}

export function normalizeBrandColor(value: unknown): string {
  return isHexColor(value) ? value.toUpperCase() : DEFAULT_BRAND_COLOR
}

function channels(hex: string): readonly [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: readonly [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** Luminancia relativa WCAG 2.x. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function mix(hex: string, toward: string, amount: number): string {
  const from = channels(hex)
  const to = channels(toward)
  return toHex([0, 1, 2].map((i) => from[i] + (to[i] - from[i]) * amount) as unknown as [number, number, number])
}

/** Aclara u oscurece el color en pasos hasta que se lea sobre el fondo indicado. */
export function ensureContrast(hex: string, background: string, min = MIN_TEXT_CONTRAST): string {
  const toward = luminance(background) > 0.5 ? '#000000' : WHITE
  for (let step = 0; step <= 20; step++) {
    const candidate = mix(hex, toward, step * 0.05)
    if (contrastRatio(candidate, background) >= min) return candidate
  }
  return toward === WHITE ? WHITE : DARK_INK
}

export function readableInk(hex: string): string {
  return contrastRatio(WHITE, hex) >= contrastRatio(DARK_INK, hex) ? WHITE : DARK_INK
}

export function brandPalette(value: unknown): BrandPalette {
  const color = normalizeBrandColor(value)
  return {
    color,
    ink: readableInk(color),
    onLight: ensureContrast(color, LIGHT_BG),
    onDark: ensureContrast(color, DARK_BG),
  }
}

/** Variables CSS para aplicar la paleta a un contenedor (clases `bg-[var(--brand)]`, etc.). */
export function brandCssVars(palette: BrandPalette): Readonly<Record<string, string>> {
  return {
    '--brand': palette.color,
    '--brand-ink': palette.ink,
    '--brand-on-light': palette.onLight,
    '--brand-on-dark': palette.onDark,
  }
}
