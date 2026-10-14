import { whatsappLink } from '@/lib/whatsapp/link'

export type AiPackId = 'pack_200' | 'pack_1000'

export interface AiPack {
  readonly id: AiPackId
  readonly credits: number
  readonly priceMxn: number
  readonly linkEnv: 'MP_LINK_AI_PACK_200' | 'MP_LINK_AI_PACK_1000'
}

export const AI_PACKS: readonly AiPack[] = [
  { id: 'pack_200', credits: 200, priceMxn: 49, linkEnv: 'MP_LINK_AI_PACK_200' },
  { id: 'pack_1000', credits: 1000, priceMxn: 199, linkEnv: 'MP_LINK_AI_PACK_1000' },
]

export type PackLinkKind = 'mercadopago' | 'whatsapp' | 'email'

export interface PackLink {
  readonly pack: AiPack
  readonly href: string
  readonly kind: PackLinkKind
}

export const SUPPORT_EMAIL = 'soporte@cotizapro.mx'

type PackEnv = Readonly<Record<string, string | undefined>>

function safeHttpsUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function packRequestText(pack: AiPack, orgName: string): string {
  return `Hola, quiero el paquete de ${pack.credits.toLocaleString('es-MX')} créditos de IA para ${orgName}.`
}

export function packLink(pack: AiPack, orgName: string, env: PackEnv): PackLink {
  const mercadoPago = safeHttpsUrl(env[pack.linkEnv])
  if (mercadoPago) return { pack, href: mercadoPago, kind: 'mercadopago' }
  const text = packRequestText(pack, orgName)
  const whatsapp = whatsappLink(env.SUPPORT_WHATSAPP_PHONE, text)
  if (whatsapp) return { pack, href: whatsapp, kind: 'whatsapp' }
  const subject = encodeURIComponent('Paquete de créditos de IA')
  return { pack, href: `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(text)}`, kind: 'email' }
}

export function packLinks(orgName: string, env: PackEnv): readonly PackLink[] {
  return AI_PACKS.map((pack) => packLink(pack, orgName, env))
}
