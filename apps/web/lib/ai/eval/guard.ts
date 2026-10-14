export const ALLOW_PRODUCTION_FLAG = '--allow-production'

/** La evaluación llama al modelo directo y sin créditos: en producción solo corre con la bandera explícita. */
export function assertEvalAllowed(env: Readonly<Record<string, string | undefined>>, args: readonly string[]): void {
  if (env.NODE_ENV === 'production' && !args.includes(ALLOW_PRODUCTION_FLAG)) {
    throw new Error(`ai:eval se niega a correr con NODE_ENV=production; pasa ${ALLOW_PRODUCTION_FLAG} si es intencional`)
  }
}
