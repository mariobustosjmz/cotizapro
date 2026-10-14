import { NextResponse } from 'next/server'
import { aiErrorMessage, aiErrorStatus, toAiError } from './errors'
import { aiPeriod } from './period'

export function aiErrorResponse(error: unknown, now: Date = new Date()): NextResponse {
  const aiError = toAiError(error)
  return NextResponse.json(
    { error: aiErrorMessage(aiError.code, aiPeriod(now).resetsOn), code: aiError.code },
    { status: aiErrorStatus(aiError.code) },
  )
}

const encoder = new TextEncoder()

function sseEvent(payload: Readonly<Record<string, unknown>>, event?: string): Uint8Array {
  return encoder.encode(`${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(payload)}\n\n`)
}

export function aiTextStreamResponse(produce: (send: (delta: string) => void) => Promise<string>, onCancel: () => void): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array): void => {
        try {
          controller.enqueue(chunk)
        } catch {
          // El cliente ya cerró: cancel() abortó la llamada y run.ts reembolsa la reserva.
        }
      }
      try {
        const text = await produce((delta) => safeEnqueue(sseEvent({ delta })))
        safeEnqueue(sseEvent({ done: true, text }))
      } catch (error) {
        const aiError = toAiError(error)
        safeEnqueue(sseEvent({ code: aiError.code, error: aiErrorMessage(aiError.code, aiPeriod(new Date()).resetsOn) }, 'error'))
      } finally {
        try {
          controller.close()
        } catch {
          // Ya estaba cerrado por cancelación.
        }
      }
    },
    cancel() {
      onCancel()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
  })
}
