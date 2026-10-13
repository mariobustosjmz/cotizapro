import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: 'CotizaPro - Cotizaciones Profesionales en Minutos',
  description: 'Cotizaciones profesionales para técnicos y talleres en México: cotiza por medidas, genera el PDF con tu logo y compártelo por WhatsApp.',
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
    description: 'Cotiza, cobra y organiza tu agenda desde el celular. Para técnicos y talleres en México.',
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
    description: 'Cotizaciones profesionales en PDF, listas para compartir por WhatsApp.',
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
