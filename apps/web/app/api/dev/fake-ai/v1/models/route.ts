import { NextResponse } from 'next/server'
import { isFakeAiEnabled } from '@/lib/ai/dev/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isFakeAiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ object: 'list', data: [{ id: process.env.AI_MODEL || 'gemma3:4b', object: 'model' }] })
}
