import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/integrations/pdf'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import type { QuoteWithItems } from '@/types/database.types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/export/quote/[id]')
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*)
      `)
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      logger.error('Quote not found for PDF export', quoteError, { quoteId: id })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'GET /api/export/quote/[id]')
    }

    const typedQuote: QuoteWithItems = {
      ...quote,
      items: quote.items ?? [],
      client: quote.client,
      subtotal: Number(quote.subtotal),
      tax_amount: Number(quote.tax_amount),
      tax_rate: Number(quote.tax_rate),
      discount_rate: Number(quote.discount_rate),
      discount_amount: Number(quote.discount_amount),
      total: Number(quote.total),
    }

    const pdfBuffer = await generateQuotePDF(typedQuote)

    logger.api('GET', `/api/export/quote/${id}`, 200, 0, { quoteNumber: quote.quote_number })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cotizacion-${quote.quote_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error: unknown) {
    logger.error('Unexpected error in GET /api/export/quote/[id]', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to export PDF'),
      'GET /api/export/quote/[id]'
    )
  }
}
