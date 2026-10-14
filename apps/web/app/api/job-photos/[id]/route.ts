import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'

const patchSchema = z.object({
  is_public: z.boolean().optional(),
  kind: z.enum(['before', 'after', 'other']).optional(),
  caption: z.string().trim().max(160).nullable().optional(),
})

async function guard(request: NextRequest, params: Promise<{ id: string }>) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return { error: applyRateLimit(limited) } as const
  const auth = await requireWritableMember(['owner', 'admin', 'member'])
  if (!auth.ok) return { error: auth.response } as const
  const id = z.string().uuid().safeParse((await params).id)
  if (!id.success) return { error: NextResponse.json({ error: 'ID inválido' }, { status: 400 }) } as const
  return { ctx: auth.ctx, id: id.data } as const
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(request, params)
  if ('error' in g) return g.error
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)
  const { data, error } = await g.ctx.supabase
    .from('job_photos')
    .update(parsed.data)
    .eq('id', g.id)
    .eq('organization_id', g.ctx.organizationId)
    .select('id, kind, caption, is_public')
    .single()
  if (error || !data) return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
  revalidatePath('/p/[slug]', 'page')
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(request, params)
  if ('error' in g) return g.error
  const { data } = await g.ctx.supabase.from('job_photos').select('storage_path').eq('id', g.id).eq('organization_id', g.ctx.organizationId).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
  const { error } = await g.ctx.supabase.from('job_photos').delete().eq('id', g.id).eq('organization_id', g.ctx.organizationId)
  if (error) return NextResponse.json({ error: 'No se pudo eliminar la foto' }, { status: 500 })
  // El registro se borra primero: un archivo huérfano en Storage es inofensivo; un registro sin archivo rompe el portafolio.
  await g.ctx.supabase.storage.from('job-photos').remove([data.storage_path as string])
  revalidatePath('/p/[slug]', 'page')
  return new NextResponse(null, { status: 204 })
}
