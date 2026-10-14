import { NextResponse, type NextRequest } from 'next/server'
import { AiError } from '@/lib/ai/errors'
import { isFollowUpEligible } from '@/lib/ai/follow-up/eligibility'
import { loadFollowUpFacts } from '@/lib/ai/follow-up/load-facts'
import { aiErrorResponse, aiTextStreamResponse } from '@/lib/ai/http'
import { followUpMessages } from '@/lib/ai/prompts/follow-up'
import { AI_EDITOR_ROLES, aiRouteContext, aiRunContext } from '@/lib/ai/route-context'
import { openAiRun, textCall } from '@/lib/ai/run'
import { validationErrorResponse } from '@/lib/error-handler'
import { followUpSchema } from '@/lib/validations/ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const route = await aiRouteContext(request, AI_EDITOR_ROLES)
  if (!route.ok) return route.response
  const parsed = followUpSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const now = new Date()
  let facts: Awaited<ReturnType<typeof loadFollowUpFacts>>
  try {
    facts = await loadFollowUpFacts(route.member.supabase, route.member.organizationId, parsed.data.quoteId)
  } catch (error) {
    return aiErrorResponse(error)
  }
  if (!facts) return NextResponse.json({ error: 'Cotización no encontrada', code: 'not_found' }, { status: 404 })
  if (!isFollowUpEligible(facts.status, facts.sentAt, now)) return aiErrorResponse(new AiError('not_eligible'))

  const abort = new AbortController()
  try {
    // Todo lo que puede lanzar va antes de reservar: entre openAiRun y execute no hay nada que retenga créditos.
    let emit: (delta: string) => void = () => undefined
    const call = textCall(route.runtime.deps, 'follow_up', followUpMessages(route.org, facts, now), (delta) => emit(delta))
    const run = await openAiRun('follow_up', aiRunContext(route.member, request, abort), route.runtime.deps)
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
