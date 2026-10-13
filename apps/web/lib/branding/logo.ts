/** Logo de empresa en el bucket público brand-assets (límite del bucket: 2 MB, PNG/JPG/WebP). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const LOGO_TYPES: Readonly<Record<string, string>> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export type LogoFileCheck = { readonly ok: true; readonly ext: string } | { readonly ok: false; readonly status: number; readonly error: string }

export function checkLogoFile(type: string, size: number): LogoFileCheck {
  const ext = LOGO_TYPES[type]
  if (!ext) return { ok: false, status: 415, error: 'Formato no permitido. Usa PNG, JPG o WebP.' }
  if (size <= 0) return { ok: false, status: 400, error: 'El archivo está vacío' }
  if (size > LOGO_MAX_BYTES) return { ok: false, status: 413, error: 'El logo pesa más de 2 MB' }
  return { ok: true, ext }
}

/** Ruta única por subida: evita que el navegador o el PDF sigan mostrando el logo anterior en caché. */
export function logoStoragePath(organizationId: string, ext: string, now: number = Date.now()): string {
  return `${organizationId}/logo-${now}.${ext}`
}
