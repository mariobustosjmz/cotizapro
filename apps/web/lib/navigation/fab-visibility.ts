/**
 * El botón flotante de acciones rápidas solo aparece en el inicio y en la portada de cada sección.
 * En formularios, detalles y ediciones tapa los botones de la barra inferior.
 */
export function shouldShowFab(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  return segments[0] === 'dashboard' && segments.length <= 2
}
