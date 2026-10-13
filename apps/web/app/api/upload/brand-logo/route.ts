import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, uploadLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { checkLogoFile, logoStoragePath } from '@/lib/branding/logo'

/** Sube el logo a brand-assets/<org>/logo-<ts>.<ext> y lo deja activo en Configuración, PDF y página pública. */
export async function POST(request: NextRequest) {
  const limited = uploadLimiter(request)
  if (limited.limited) return applyRateLimit(limited)

  const auth = await requireMember(['owner', 'admin'])
  if (!auth.ok) return auth.response

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona una imagen' }, { status: 400 })
  const check = checkLogoFile(file.type, file.size)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { supabase, organizationId } = auth.ctx
  const path = logoStoragePath(organizationId, check.ext)
  const upload = await supabase.storage.from('brand-assets').upload(path, file, { contentType: file.type, upsert: false })
  if (upload.error) {
    logger.error('brand logo upload failed', upload.error, { organizationId })
    return NextResponse.json({ error: 'No se pudo subir el logo' }, { status: 500 })
  }
  const logoUrl = supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl

  const saved = await supabase.rpc('update_org_settings', { p_name: null, p_settings: { logo_url: logoUrl } })
  if (saved.error) {
    await supabase.storage.from('brand-assets').remove([path])
    logger.error('brand logo settings update failed', saved.error, { organizationId })
    return NextResponse.json({ error: 'No se pudo guardar el logo' }, { status: 500 })
  }
  const profile = await supabase.from('public_profiles').update({ logo_path: path }).eq('organization_id', organizationId)
  if (profile.error) logger.warn('public profile logo_path not updated', { organizationId, message: profile.error.message })

  return NextResponse.json({ data: { logo_url: logoUrl } }, { status: 201 })
}
