import { NextResponse } from 'next/server'
import { requireMember } from '@/lib/auth/require-member'
import { getMessagingChannels } from '@/lib/messaging/channels'

export async function GET() {
  const auth = await requireMember()
  if (!auth.ok) return auth.response
  return NextResponse.json({ data: getMessagingChannels() })
}
