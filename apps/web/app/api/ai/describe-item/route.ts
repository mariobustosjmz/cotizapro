import type { NextRequest } from 'next/server'
import { aiErrorResponse, aiTextStreamResponse } from '@/lib/ai/http'
import { describeItemMessages } from '@/lib/ai/prompts/describe-item'
import { AI_EDITOR_ROLES, aiRouteContext, aiRunContext } from '@/lib/ai/route-context'
import { openAiRun, textCall } from '@/lib/ai/run'
import { validationErrorResponse } from '@/lib/error-handler'
import { describeItemSchema } from '@/lib/validations/ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const route = await aiRouteContext(request, AI_EDITOR_ROLES)
  if (!route.ok) return route.response
  const parsed = describeItemSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const abort = new AbortController()
  try {
    // Todo lo que puede lanzar va antes de reservar: entre openAiRun y execute no hay nada que retenga créditos.
    let emit: (delta: string) => void = () => undefined
    const call = textCall(route.runtime.deps, 'describe_item', describeItemMessages(route.org, parsed.data), (delta) => emit(delta))
    const run = await openAiRun('describe_item', aiRunContext(route.member, request, abort), route.runtime.deps)
    return aiTextStreamResponse(
      (send) => {
        emit = send
        return run.execute(call)
      },
      () => abort.abort(),
    )
  } catch (error) {
    return aiErrorResponse(error)
  }
}
