import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const limitResult = defaultApiLimiter(request)
  if (limitResult.limited) {
    return applyRateLimit(limitResult)
  }

  const supabase = await createServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to sign out' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
