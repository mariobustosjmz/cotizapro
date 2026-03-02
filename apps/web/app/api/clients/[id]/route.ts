import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateClientSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

// GET /api/clients/[id] - Get single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Fetch client (RLS will enforce organization filter)
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PATCH /api/clients/[id] - Update client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()

    // Convert empty strings to null for optional fields
    const sanitizedBody = {
      ...body,
      email: body.email === '' ? null : body.email,
      phone: body.phone === '' ? null : body.phone,
      whatsapp_phone: body.whatsapp_phone === '' ? null : body.whatsapp_phone,
      address: body.address === '' ? null : body.address,
      city: body.city === '' ? null : body.city,
      state: body.state === '' ? null : body.state,
      postal_code: body.postal_code === '' ? null : body.postal_code,
      notes: body.notes === '' ? null : body.notes,
    }

    const validation = updateClientSchema.safeParse(sanitizedBody)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    // Update client (RLS will enforce organization filter)
    const { data: client, error } = await supabase
      .from('clients')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      }
      console.error('Error updating client:', error)
      return NextResponse.json({ error: 'Error al actualizar el cliente' }, { status: 500 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/clients/[id] - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if client has quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id')
      .eq('client_id', id)
      .limit(1)

    if (quotesError) {
      console.error('Error checking quotes:', quotesError)
      return NextResponse.json({ error: quotesError.message }, { status: 500 })
    }

    if (quotes && quotes.length > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar el cliente porque tiene cotizaciones asociadas'
      }, { status: 400 })
    }

    // Delete client (RLS will enforce organization filter)
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      }
      console.error('Error deleting client:', error)
      return NextResponse.json({ error: 'Error al eliminar el cliente' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
