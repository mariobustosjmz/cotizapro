import type { RewriteMode } from '@/lib/validations/ai'

/** Aparte de prompts/rewrite.ts: ese módulo arrastra código de servidor y el botón corre en el navegador. */
export const REWRITE_MODE_LABELS: Readonly<Record<RewriteMode, string>> = {
  polish: 'Pulir',
  shorter: 'Más corto',
  formal: 'Más formal',
  english: 'En inglés',
}
