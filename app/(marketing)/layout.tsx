import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: 'CotizaPro - Cotizaciones Profesionales en Minutos',
  description: 'La herramienta perfecta para técnicos de mantenimiento en México. Crea cotizaciones profesionales en PDF, envíalas por WhatsApp y Email en minutos.',
  keywords: ['cotizaciones', 'técnicos', 'mantenimiento', 'HVAC', 'plomería', 'pintura', 'electricistas', 'WhatsApp', 'México', 'CRM', 'facturación', 'CFDI', 'PDF', 'servicios'],
  authors: [{ name: 'CotizaPro' }],
  creator: 'CotizaPro',
  publisher: 'CotizaPro',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'CotizaPro - Cotizaciones Profesionales en Minutos',
    description: 'Crea, envía y gestiona cotizaciones por WhatsApp y Email. La herramienta perfecta para técnicos de mantenimiento en México.',
    type: 'website',
    locale: 'es_MX',
    url: siteUrl,
    siteName: 'CotizaPro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CotizaPro - Cotizaciones Profesionales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CotizaPro - Cotizaciones Profesionales en Minutos',
    description: 'Crea cotizaciones profesionales en PDF, envíalas por WhatsApp y Email en minutos.',
    images: ['/og-image.png'],
    creator: '@CotizaPro',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code-here',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
