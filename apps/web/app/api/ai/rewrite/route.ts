import type { NextRequest } from 'next/server'
import { AiError } from '@/lib/ai/errors'
import { aiErrorResponse, aiTextStreamResponse } from '@/lib/ai/http'
import { rewriteMessages } from '@/lib/ai/prompts/rewrite'
import { REWRITE_OUTPUT_LIMITS } from '@/lib/ai/rewrite-limits'
import { AI_ADMIN_ROLES, AI_EDITOR_ROLES, aiRouteContext, aiRunContext } from '@/lib/ai/route-context'
import { openAiRun, textCall } from '@/lib/ai/run'
import { validationErrorResponse } from '@/lib/error-handler'
import { rewriteSchema } from '@/lib/validations/ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const route = await aiRouteContext(request, AI_EDITOR_ROLES)
  if (!route.ok) return route.response
  const parsed = rewriteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)
  if (parsed.data.context === 'review_reply' && !AI_ADMIN_ROLES.includes(route.member.role)) {
    return aiErrorResponse(new AiError('forbidden'))
  }

  const abort = new AbortController()
  try {
    // Todo lo que puede lanzar va antes de reservar: entre openAiRun y execute no hay nada que retenga créditos.
    let emit: (delta: string) => void = () => undefined
    const call = textCall(route.runtime.deps, 'rewrite', rewriteMessages(route.org, parsed.data), (delta) => emit(delta), REWRITE_OUTPUT_LIMITS[parsed.data.context])
    const run = await openAiRun('rewrite', aiRunContext(route.member, request, abort), route.runtime.deps)
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
