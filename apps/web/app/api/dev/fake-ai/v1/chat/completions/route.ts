import { NextResponse, type NextRequest } from 'next/server'
import { fakeChatRequestSchema, fakeReply, fakeSseBody } from '@/lib/ai/dev/fake-model'
import { isFakeAiEnabled } from '@/lib/ai/dev/guard'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isFakeAiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const parsed = fakeChatRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad request' }, { status: 400 })
  const reply = fakeReply(parsed.data)
  if (reply.kind === 'fail') return NextResponse.json({ error: 'fake failure' }, { status: 500 })
  if (parsed.data.stream) {
    return new Response(fakeSseBody(reply.content), { headers: { 'Content-Type': 'text/event-stream' } })
  }
  return NextResponse.json({
    choices: [{ message: { role: 'assistant', content: reply.content } }],
    usage: { prompt_tokens: 150, completion_tokens: 80 },
  })
}
