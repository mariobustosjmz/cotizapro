export type FakeAiEnv = Readonly<Record<string, string | undefined>>

const FAKE_AI_PATH_PREFIX = '/api/dev/fake-ai/'

/**
 * Nunca en producción. Fuera de producción solo si AI_BASE_URL apunta explícitamente a estas rutas;
 * sin esa configuración las rutas responden 404 aunque el servidor de desarrollo esté arriba.
 */
export function isFakeAiEnabled(env: FakeAiEnv = process.env): boolean {
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') return false
  const url = env.AI_BASE_URL ? URL.parse(env.AI_BASE_URL) : null
  return url !== null && url.pathname.startsWith(FAKE_AI_PATH_PREFIX)
}
