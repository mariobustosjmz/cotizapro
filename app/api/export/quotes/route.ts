import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/export/quotes
 *
 * Export quotes list as CSV file
 *
 * Query parameters:
 * - status: filter by status
 * - from_date: start date (YYYY-MM-DD)
 * - to_date: end date (YYYY-MM-DD)
 */

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const from_date = searchParams.get('from_date')
    const to_date = searchParams.get('to_date')

    // Build query
    let query = supabase
      .from('quotes')
      .select(`
        *,
        client:clients(name, phone, email)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(10000)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (from_date) {
      query = query.gte('created_at', from_date)
    }

    if (to_date) {
      query = query.lte('created_at', to_date)
    }

    const { data: quotes, error } = await query

    if (error) {
      console.error('Error fetching quotes:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Generate CSV
    const headers = [
      'Número de Cotización',
      'Cliente',
      'Teléfono Cliente',
      'Email Cliente',
      'Estado',
      'Subtotal',
      'Descuento',
      'IVA',
      'Total',
      'Fecha de Creación',
      'Válida Hasta',
      'Fecha de Envío',
      'Fecha de Aceptación',
    ]

    const rows = quotes?.map(quote => [
      quote.quote_number,
      quote.client?.name || '',
      quote.client?.phone || '',
      quote.client?.email || '',
      quote.status,
      quote.subtotal.toFixed(2),
      quote.discount_amount.toFixed(2),
      quote.tax_amount.toFixed(2),
      quote.total.toFixed(2),
      new Date(quote.created_at).toLocaleDateString('es-MX'),
      new Date(quote.valid_until).toLocaleDateString('es-MX'),
      quote.sent_at ? new Date(quote.sent_at).toLocaleDateString('es-MX') : '',
      quote.accepted_at ? new Date(quote.accepted_at).toLocaleDateString('es-MX') : '',
    ]) || []

    // Escape CSV fields
    const escapeCSV = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`
      }
      return field
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(field => escapeCSV(String(field))).join(',')),
    ].join('\n')

    // Add BOM for Excel UTF-8 support
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // Return as downloadable file
    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cotizaciones_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
