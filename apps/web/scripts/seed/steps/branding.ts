import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { SeedAccount } from '../data/accounts'
import { type Admin, check } from '../util'

const LOGOS_DIR = path.resolve(__dirname, '../data/logos')

/**
 * Sube el logo de ejemplo a brand-assets, lo asigna a la página pública y agrega logo_url y brand_color
 * a organizations.settings sin perder el resto de la configuración.
 */
export async function seedBranding(admin: Admin, orgId: string, brand: SeedAccount['brand']): Promise<void> {
  const logoPath = `${orgId}/logo.png`
  const upload = await admin.storage
    .from('brand-assets')
    .upload(logoPath, readFileSync(path.join(LOGOS_DIR, `${brand.logo}.png`)), { contentType: 'image/png', upsert: true })
  if (upload.error) throw new Error(`logo ${logoPath}: ${upload.error.message}`)
  const logoUrl = admin.storage.from('brand-assets').getPublicUrl(logoPath).data.publicUrl

  check(await admin.from('public_profiles').update({ logo_path: logoPath }).eq('organization_id', orgId), 'logo de la página')
  const { data: org, error } = await admin.from('organizations').select('settings').eq('id', orgId).single()
  if (error) throw new Error(`settings ${orgId}: ${error.message}`)
  const settings = (org?.settings ?? {}) as Record<string, unknown>
  check(
    await admin.from('organizations').update({ settings: { ...settings, logo_url: logoUrl, brand_color: brand.color } }).eq('id', orgId),
    'branding de la empresa',
  )
}
