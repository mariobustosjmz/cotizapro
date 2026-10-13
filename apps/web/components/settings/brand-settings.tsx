'use client'

import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { ImageUp, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { DEFAULT_BRAND_COLOR, brandCssVars, brandPalette, normalizeBrandColor } from '@/lib/branding/color'
import { LOGO_TYPES } from '@/lib/branding/logo'

interface BrandSettingsProps {
  readonly initialLogoUrl: string | null
  readonly initialColor: string | null
  readonly companyName: string
}

const ACCEPT = Object.keys(LOGO_TYPES).join(',')

/** Logo y color de marca con vista previa. Los inputs logo_url y brand_color viajan con el formulario de la empresa. */
export function BrandSettings({ initialLogoUrl, initialColor, companyName }: BrandSettingsProps) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? '')
  const [color, setColor] = useState(initialColor ?? DEFAULT_BRAND_COLOR)
  const [uploading, setUploading] = useState(false)
  const preview = brandCssVars(brandPalette(normalizeBrandColor(color))) as CSSProperties

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/upload/brand-logo', { method: 'POST', body })
      const json: { data?: { logo_url: string }; error?: string } = await res.json()
      if (!res.ok || !json.data) throw new Error(json.error ?? 'No se pudo subir el logo')
      setLogoUrl(json.data.logo_url)
      toast({ message: 'Logo actualizado', variant: 'success' })
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'No se pudo subir el logo', variant: 'error' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField label="Logo" htmlFor="logo_file" hint="PNG, JPG o WebP de hasta 2 MB. Aparece en tus PDF, tu página pública y el panel.">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo servido desde Storage del propio proyecto
              <img src={logoUrl} alt="Logo actual" className="w-full h-full object-contain" />
            ) : (
              <span className="text-[10px] text-gray-400">Sin logo</span>
            )}
          </div>
          <input ref={fileRef} id="logo_file" type="file" accept={ACCEPT} className="hidden" onChange={upload} />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ImageUp className="w-4 h-4 mr-1.5" />}
            {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
          </Button>
          {logoUrl && !uploading && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl('')} aria-label="Quitar logo">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <input type="hidden" name="logo_url" value={logoUrl} />
        </div>
      </FormField>

      <FormField label="Color de marca" htmlFor="brand_color" hint="Botones y encabezados en PDF, página y panel">
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label="Elegir color de marca"
            value={normalizeBrandColor(color)}
            onChange={(e) => setColor(e.target.value.toUpperCase())}
            className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
          />
          <Input
            id="brand_color"
            name="brand_color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder={DEFAULT_BRAND_COLOR}
            pattern="^#[0-9A-Fa-f]{6}$"
            className="flex-1 font-mono"
          />
        </div>
      </FormField>

      <div className="md:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={preview} data-testid="brand-preview">
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--brand)] text-[var(--brand-ink)]">
          <div className="w-9 h-9 rounded-md bg-white flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa del logo subido
              <img src={logoUrl} alt="" className="w-full h-full object-contain" />
            ) : null}
          </div>
          <span className="font-semibold text-sm truncate">{companyName || 'Tu empresa'}</span>
          <span className="ml-auto text-xs opacity-80">Así se ve el encabezado del PDF</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900">
          <span className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-[var(--brand)] text-[var(--brand-ink)]">Pedir cotización</span>
          <span className="text-sm font-medium text-[var(--brand-on-light)]">Texto con tu color</span>
        </div>
      </div>
    </div>
  )
}
