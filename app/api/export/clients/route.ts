import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/export/clients
 *
 * Export clients list as CSV file
 *
 * Query parameters:
 * - format: "csv" (default)
 * - tags: comma-separated tags to filter
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
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)

    // Build query
    let query = supabase
      .from('clients')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(10000)

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }

    const { data: clients, error } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Generate CSV
    const headers = [
      'Nombre',
      'Email',
      'Teléfono',
      'WhatsApp',
      'Dirección',
      'Ciudad',
      'Estado',
      'Código Postal',
      'Etiquetas',
      'Notas',
      'Fecha de Creación',
    ]

    const rows = clients?.map(client => [
      client.name,
      client.email || '',
      client.phone,
      client.whatsapp_phone || '',
      client.address || '',
      client.city || '',
      client.state || '',
      client.postal_code || '',
      client.tags?.join('; ') || '',
      client.notes || '',
      new Date(client.created_at).toLocaleDateString('es-MX'),
    ]) || []

    // Escape CSV fields (handle commas and quotes)
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
        'Content-Disposition': `attachment; filename="clientes_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
