/** Paleta derivada del color de marca de la empresa; todas las variantes cumplen contraste legible. */
export interface BrandPalette {
  /** Color de marca tal cual (fondos de botones, bandas). */
  readonly color: string
  /** Texto sobre el color de marca: blanco o casi negro. */
  readonly ink: string
  /** Variante para texto y acentos sobre fondo claro. */
  readonly onLight: string
  /** Variante para texto y acentos sobre fondo oscuro (barra lateral, modo oscuro). */
  readonly onDark: string
}

export interface OrgBranding {
  readonly name: string
  readonly logoUrl: string | null
  readonly palette: BrandPalette
}
