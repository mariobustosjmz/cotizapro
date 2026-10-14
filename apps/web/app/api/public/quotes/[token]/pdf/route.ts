import { NextRequest, NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/integrations/pdf'
import { getPublicQuote } from '@/lib/public-quote/get-public-quote'
import { toPdfOrgSettings, toPdfQuote } from '@/lib/public-quote/pdf-input'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

interface RouteContext {
  readonly params: Promise<{ token: string }>
}

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } as const

/** Público: PDF de la cotización con la liga /c/<token>. Sustituye la URL adivinable del bucket documents. */
export async function GET(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const { token } = await params
  const quote = await getPublicQuote(token)
  if (!quote) return NextResponse.json({ error: 'Liga no disponible' }, { status: 404, headers: PRIVATE_HEADERS })

  try {
    const pdf = await generateQuotePDF(toPdfQuote(quote), quote.business.name, toPdfOrgSettings(quote))
    const fileName = `cotizacion-${quote.quote_number.replace(/[^A-Za-z0-9-]/g, '')}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': pdf.length.toString(),
      },
    })
  } catch (error) {
    logger.error('public quote PDF failed', error)
    return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500, headers: PRIVATE_HEADERS })
  }
}
