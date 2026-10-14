import { NextResponse, type NextRequest } from 'next/server'
import { aiErrorResponse } from '@/lib/ai/http'
import { AI_ADMIN_ROLES, aiRouteContext, aiRunContext } from '@/lib/ai/route-context'
import { openAiRun } from '@/lib/ai/run'
import { loadShowcaseFacts, showcaseTextsCall } from '@/lib/ai/showcase-texts'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const route = await aiRouteContext(request, AI_ADMIN_ROLES)
  if (!route.ok) return route.response
  try {
    // Lo que puede lanzar va antes de reservar: entre openAiRun y execute no queda nada que retenga créditos.
    const facts = await loadShowcaseFacts(route.member.supabase, route.member.organizationId, route.org.name)
    const call = showcaseTextsCall(route.runtime.deps, route.org, facts)
    const run = await openAiRun('showcase_texts', aiRunContext(route.member, request), route.runtime.deps)
    return NextResponse.json({ data: await run.execute(call) })
  } catch (error) {
    return aiErrorResponse(error)
  }
}
