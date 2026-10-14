import { sendEmail } from '@/lib/integrations/email'
import { notifyUsageThreshold } from './alerts'
import { loadAiConfig, type AiConfig } from './config'
import { createAiHealth, type AiHealth } from './health'
import { createAiQueue } from './queue'
import type { AiRunDeps } from './run'

export interface AiRuntime {
  readonly config: AiConfig
  readonly health: AiHealth
  readonly deps: AiRunDeps
}

const RUNTIME_KEY = Symbol.for('cotizapro.aiRuntime')
const MAX_WAITING = 6
const AFTER_SUCCESS_CEILING_MS = 5000
type GlobalWithAi = typeof globalThis & { [RUNTIME_KEY]?: AiRuntime }

/** Nunca rechaza y nunca espera más del tope: el aviso por correo no debe retrasar la respuesta. */
async function boundedAfterSuccess(task: () => Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const ceiling = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, AFTER_SUCCESS_CEILING_MS)
  })
  try {
    await Promise.race([task().catch(() => undefined), ceiling])
  } finally {
    clearTimeout(timer)
  }
}

function createRuntime(): AiRuntime {
  const config = loadAiConfig()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return {
    config,
    health: createAiHealth({ config }),
    deps: {
      client: { config },
      queue: createAiQueue({ maxWaiting: MAX_WAITING, waitTimeoutMs: config.timeoutMs }),
      afterSuccess: (db, summary) => boundedAfterSuccess(() => notifyUsageThreshold(db, summary, sendEmail, appUrl)),
    },
  }
}

/** globalThis: Next puede cargar una copia del módulo por ruta (y HMR en desarrollo); la cola debe ser una sola por proceso. */
export function aiRuntime(): AiRuntime {
  const store = globalThis as GlobalWithAi
  const existing = store[RUNTIME_KEY]
  if (existing) return existing
  const runtime = createRuntime()
  store[RUNTIME_KEY] = runtime
  return runtime
}
