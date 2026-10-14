export function quoteItemElementId(index: number): string {
  return `quote-item-${index}`
}

/** Lleva a la partida con problema y enfoca su primer control visible (fila de escritorio o tarjeta móvil). */
export function focusQuoteItem(index: number): void {
  const row = document.getElementById(quoteItemElementId(index))
  if (!row) return
  row.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const controls = Array.from(row.querySelectorAll<HTMLElement>('input, button'))
  controls.find((control) => control.offsetParent !== null)?.focus({ preventScroll: true })
}
