import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CotizaPro - Cotizaciones Profesionales en Minutos',
  description: 'La herramienta perfecta para técnicos de mantenimiento en México. Crea cotizaciones profesionales en PDF, envíalas por WhatsApp y Email en minutos.',
  keywords: 'cotizaciones, técnicos, mantenimiento, HVAC, plomería, pintura, WhatsApp, México',
  openGraph: {
    title: 'CotizaPro - Cotizaciones Profesionales en Minutos',
    description: 'Crea, envía y gestiona cotizaciones por WhatsApp y Email. La herramienta perfecta para técnicos de mantenimiento.',
    type: 'website',
    locale: 'es_MX',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
