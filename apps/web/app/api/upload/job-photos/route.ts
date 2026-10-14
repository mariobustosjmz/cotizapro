import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from '@/lib/showcase/job-photos'

const fieldsSchema = z.object({
  quote_id: z.string().uuid('Cotización inválida'),
  kind: z.enum(['before', 'after', 'other']),
  caption: z.string().trim().max(160).optional(),
})

/** Sube una foto de trabajo a job-photos/<org>/<quote>/<uuid>.<ext> y la registra (privada por defecto). */
export async function POST(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireWritableMember(['owner', 'admin', 'member'])
  if (!auth.ok) return auth.response
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const fields = fieldsSchema.safeParse({ quote_id: form?.get('quote_id'), kind: form?.get('kind'), caption: form?.get('caption') || undefined })
  if (!fields.success || !(file instanceof File)) return NextResponse.json({ error: 'Datos de foto incompletos' }, { status: 400 })
  const ext = PHOTO_TYPES[file.type]
  if (!ext) return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG o WebP.' }, { status: 415 })
  if (file.size > PHOTO_MAX_BYTES) return NextResponse.json({ error: 'La foto pesa más de 5 MB' }, { status: 413 })

  const { supabase, organizationId, userId } = auth.ctx
  const { data: quote } = await supabase.from('quotes').select('id').eq('id', fields.data.quote_id).eq('organization_id', organizationId).maybeSingle()
  if (!quote) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

  const path = `${organizationId}/${quote.id}/${randomUUID()}.${ext}`
  const upload = await supabase.storage.from('job-photos').upload(path, file, { contentType: file.type, upsert: false })
  if (upload.error) {
    logger.error('job photo upload failed', upload.error, { quoteId: quote.id })
    return NextResponse.json({ error: 'No se pudo subir la foto' }, { status: 500 })
  }
  const { data, error } = await supabase
    .from('job_photos')
    .insert({ organization_id: organizationId, quote_id: quote.id, storage_path: path, kind: fields.data.kind, caption: fields.data.caption ?? null, created_by: userId })
    .select('id, kind, caption, is_public')
    .single()
  if (error) {
    await supabase.storage.from('job-photos').remove([path])
    logger.error('job photo insert failed', error, { quoteId: quote.id })
    return NextResponse.json({ error: 'No se pudo registrar la foto' }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
