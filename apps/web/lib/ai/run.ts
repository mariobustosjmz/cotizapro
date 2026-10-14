import type { z } from 'zod'
import { logger } from '@/lib/logger'
import { chatJson, chatText, EMPTY_USAGE, type AiCallResult, type AiClientDeps, type AiMessage } from './client'
import { AiError, toAiError } from './errors'
import { AI_FEATURES, type AiFeatureId } from './features'
import type { AiQueue } from './queue'
import { createStreamSanitizer, sanitizeText } from './sanitize'
import { finishUsage, getUsageSummary, reserveCredits, type AiDb, type AiReservation, type AiUsageSummary } from './usage'

export interface AiRunContext {
  readonly db: AiDb
  readonly organizationId: string
  readonly signal?: AbortSignal
}

export interface AiRunDeps {
  readonly client: AiClientDeps
  readonly queue: AiQueue
  readonly afterSuccess?: (db: AiDb, summary: AiUsageSummary) => Promise<void>
}

export type AiCall<T> = (signal: AbortSignal | undefined) => Promise<AiCallResult<T>>

export interface AiRun {
  execute<T>(call: AiCall<T>): Promise<T>
}

/** Detalle del AiError cuando quien se fue fue el cliente, no el proveedor; errors.ts no tiene un código propio para esto. */
const CLIENT_DISCONNECT = 'client_disconnect'

const clientGone = (ctx: AiRunContext): boolean => ctx.signal?.aborted === true

interface RunTiming {
  /** Tiempo del proveedor, desde que la cola dio el turno (0 si nunca lo dio). */
  readonly latencyMs: number
  readonly waitMs: number
}

interface QueueClock {
  readonly grant: () => void
  readonly waitMs: () => number
  readonly timing: () => RunTiming
}

function queueClock(now: () => number): QueueClock {
  const queuedAt = now()
  let grantedAt: number | null = null
  return {
    grant: () => {
      grantedAt = now()
    },
    waitMs: () => (grantedAt ?? now()) - queuedAt,
    timing: () => {
      const end = now()
      return grantedAt === null ? { latencyMs: 0, waitMs: end - queuedAt } : { latencyMs: end - grantedAt, waitMs: grantedAt - queuedAt }
    },
  }
}

function callInQueue<T>(ctx: AiRunContext, deps: AiRunDeps, clock: QueueClock, call: AiCall<T>): Promise<AiCallResult<T>> {
  return deps.queue.run(ctx.organizationId, () => {
    clock.grant()
    return clientGone(ctx) ? Promise.reject(new AiError('timeout', CLIENT_DISCONNECT)) : call(ctx.signal)
  })
}

async function settleFailure(reservation: AiReservation, ctx: AiRunContext, error: unknown, timing: RunTiming): Promise<AiError> {
  // Se revisa la señal antes de toAiError: el AbortError del cliente no es un tiempo agotado del proveedor.
  const disconnected = clientGone(ctx)
  const aiError = disconnected ? new AiError('timeout', CLIENT_DISCONNECT) : toAiError(error)
  await finishUsage(ctx.db, reservation, { ok: false, usage: EMPTY_USAGE, latencyMs: timing.latencyMs })
  const meta = { feature: reservation.feature, organizationId: ctx.organizationId, ...timing }
  if (disconnected) logger.info('ai feature cancelled by client', meta)
  else logger.warn('ai feature failed', { ...meta, code: aiError.code })
  return aiError
}

/**
 * Ya se cobró: nada de aquí en adelante puede romper la respuesta ni cerrar la reserva otra vez.
 * Corre sin await (el servidor de Node vive lo suficiente) para que el aviso de uso no retrase la respuesta ni el evento done.
 * El logger redacta llaves que contienen "token", por eso promptTok/outputTok.
 */
async function afterCharge<T>(reservation: AiReservation, ctx: AiRunContext, deps: AiRunDeps, result: AiCallResult<T>, waitMs: number): Promise<void> {
  try {
    const { promptTokens, completionTokens } = result.usage
    logger.info('ai feature ok', { feature: reservation.feature, organizationId: ctx.organizationId, latencyMs: result.latencyMs, waitMs, promptTok: promptTokens, outputTok: completionTokens })
    if (deps.afterSuccess) await deps.afterSuccess(ctx.db, await getUsageSummary(ctx.db))
  } catch (error) {
    logger.warn('ai after-success hook failed', { feature: reservation.feature, reason: error instanceof Error ? error.name : 'unknown' })
  }
}

async function executeReserved<T>(reservation: AiReservation, ctx: AiRunContext, deps: AiRunDeps, call: AiCall<T>): Promise<T> {
  const clock = queueClock(deps.client.now ?? Date.now)
  let result: AiCallResult<T>
  try {
    result = await callInQueue(ctx, deps, clock, call)
    if (clientGone(ctx)) throw new AiError('timeout', CLIENT_DISCONNECT)
  } catch (error) {
    throw await settleFailure(reservation, ctx, error, clock.timing())
  }
  await finishUsage(ctx.db, reservation, { ok: true, usage: result.usage, latencyMs: result.latencyMs })
  void afterCharge(reservation, ctx, deps, result, clock.waitMs()).catch(() => undefined)
  return result.value
}

/** Reserva antes de abrir el stream, así los 402/429 llegan como JSON con su estado HTTP. */
export async function openAiRun(feature: AiFeatureId, ctx: AiRunContext, deps: AiRunDeps): Promise<AiRun> {
  const reservation = await reserveCredits(ctx.db, feature)
  let used = false
  return {
    execute<T>(call: AiCall<T>): Promise<T> {
      if (used) return Promise.reject(new AiError('invalid_input', 'run_reused'))
      used = true
      return executeReserved(reservation, ctx, deps, call)
    },
  }
}

export async function runAiFeature<T>(feature: AiFeatureId, ctx: AiRunContext, deps: AiRunDeps, call: AiCall<T>): Promise<T> {
  const run = await openAiRun(feature, ctx, deps)
  return run.execute(call)
}

export function jsonCall<T>(deps: AiRunDeps, feature: AiFeatureId, messages: readonly AiMessage[], schema: z.ZodType<T>): AiCall<T> {
  const spec = AI_FEATURES[feature]
  return (signal) => chatJson(deps.client, messages, schema, { temperature: spec.temperature, maxTokens: spec.maxTokens, signal })
}

export function textCall(deps: AiRunDeps, feature: AiFeatureId, messages: readonly AiMessage[], onDelta: (delta: string) => void, maxChars?: number): AiCall<string> {
  const spec = AI_FEATURES[feature]
  const limit = Math.min(spec.maxOutputChars, maxChars ?? spec.maxOutputChars)
  return async (signal) => {
    const stream = createStreamSanitizer(limit)
    const emit = (text: string): void => {
      if (text) onDelta(text)
    }
    const options = { temperature: spec.temperature, maxTokens: spec.maxTokens, signal }
    const result = await chatText(deps.client, messages, options, (delta) => emit(stream.push(delta)))
    emit(stream.end())
    const clean = sanitizeText(result.value, limit)
    if (!clean) throw new AiError('invalid_output', 'empty_text')
    return { ...result, value: clean }
  }
}
