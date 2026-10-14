import { NextResponse, type NextRequest } from 'next/server'
import { aiErrorResponse } from '@/lib/ai/http'
import { whatsappDraftMessages } from '@/lib/ai/prompts/whatsapp-draft'
import { AI_EDITOR_ROLES, aiRouteContext, aiRunContext, type AiOrgInfo } from '@/lib/ai/route-context'
import { jsonCall, openAiRun, type AiCall, type AiRunDeps } from '@/lib/ai/run'
import { buildDraftResult } from '@/lib/ai/whatsapp/draft-result'
import { normalizeExtraction, rawExtractionSchema } from '@/lib/ai/whatsapp/extraction'
import type { DraftExtraction } from '@/lib/ai/whatsapp/types'
import { validationErrorResponse } from '@/lib/error-handler'
import { whatsappDraftSchema } from '@/lib/validations/ai'

export const dynamic = 'force-dynamic'

function draftCall(deps: AiRunDeps, org: AiOrgInfo, message: string): AiCall<DraftExtraction> {
  const call = jsonCall(deps, 'whatsapp_draft', whatsappDraftMessages(org, message), rawExtractionSchema)
  return async (signal) => {
    const result = await call(signal)
    return { ...result, value: normalizeExtraction(result.value) }
  }
}

/** Solo regresa un borrador: no crea clientes ni cotizaciones. */
export async function POST(request: NextRequest) {
  const route = await aiRouteContext(request, AI_EDITOR_ROLES)
  if (!route.ok) return route.response
  const parsed = whatsappDraftSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  try {
    // Todo lo que puede lanzar va antes de reservar: entre openAiRun y execute no hay nada que retenga créditos.
    const call = draftCall(route.runtime.deps, route.org, parsed.data.message)
    const run = await openAiRun('whatsapp_draft', aiRunContext(route.member, request), route.runtime.deps)
    const extraction = await run.execute(call)
    const data = await buildDraftResult(route.member.supabase, route.member.organizationId, extraction)
    return NextResponse.json({ data })
  } catch (error) {
    return aiErrorResponse(error)
  }
}
