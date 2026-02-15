import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createQuoteSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

// GET /api/quotes - Listado de cotizaciones con filtros
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const client_id = searchParams.get('client_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construir query
    let query = supabase
      .from('quotes')
      .select(`
        *,
        client:clients(id, name, email, phone),
        items:quote_items(count)
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (client_id) {
      query = query.eq('client_id', client_id)
    }

    const { data: quotes, error, count } = await query

    if (error) {
      console.error('Error al obtener cotizaciones:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      data: quotes,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/quotes - Crear cotización con items
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Validar datos
    const body = await request.json()
    const validation = createQuoteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validación fallida',
        details: validation.error.issues,
      }, { status: 400 })
    }

    const { items, discount_rate, ...quoteData } = validation.data

    // Calcular totales
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)

    const discount_amount = subtotal * (discount_rate / 100)
    const subtotal_after_discount = subtotal - discount_amount
    const tax_rate = 16.00 // IVA 16%
    const tax_amount = subtotal_after_discount * (tax_rate / 100)
    const total = subtotal_after_discount + tax_amount

    // Generar número de cotización
    const { data: quoteNumberResult, error: rpcError } = await supabase
      .rpc('generate_quote_number', { org_id: profile.organization_id })

    if (rpcError || !quoteNumberResult) {
      console.error('Error al generar número de cotización:', rpcError)
      return NextResponse.json({
        error: 'Error al generar número de cotización'
      }, { status: 500 })
    }

    // Insertar cotización
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        ...quoteData,
        organization_id: profile.organization_id,
        quote_number: quoteNumberResult,
        subtotal: Number(subtotal.toFixed(2)),
        tax_rate,
        tax_amount: Number(tax_amount.toFixed(2)),
        discount_rate,
        discount_amount: Number(discount_amount.toFixed(2)),
        total: Number(total.toFixed(2)),
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single()

    if (quoteError) {
      console.error('Error al crear cotización:', quoteError)
      return NextResponse.json({ error: quoteError.message }, { status: 500 })
    }

    // Insertar items de cotización
    const quoteItems = items.map((item, index) => ({
      quote_id: quote.id,
      service_id: item.service_id || null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_type: item.unit_type,
      subtotal: Number((item.quantity * item.unit_price).toFixed(2)),
      sort_order: index,
    }))

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems)

    if (itemsError) {
      console.error('Error al crear items:', itemsError)
      // Rollback: eliminar cotización creada
      await supabase.from('quotes').delete().eq('id', quote.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Obtener cotización completa con items y cliente
    const { data: completeQuote } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*)
      `)
      .eq('id', quote.id)
      .single()

    return NextResponse.json({ data: completeQuote }, { status: 201 })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
