import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { generateAnalyticsPDF } from '@/lib/integrations/analytics-pdf'

/**
 * GET /api/export/analytics-report
 *
 * Generate and download comprehensive analytics PDF report
 *
 * Query parameters:
 * - period: "week" | "month" | "quarter" | "year" (default: "month")
 */


type SummaryRow = [string, string]
type StatusRow = [string, string]

export async function GET(request: NextRequest) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, organizations(name)')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const orgId = profile.organization_id
    const orgName = (profile.organizations as { name?: string } | null)?.name ?? 'Mi Organización'

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month'

    let daysBack: number
    switch (period) {
      case 'week': daysBack = 7; break
      case 'quarter': daysBack = 90; break
      case 'year': daysBack = 365; break
      default: daysBack = 30; break
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split('T')[0]

    const [
      { count: totalClients },
      { count: totalQuotes },
      { count: totalReminders },
      { data: quotes },
      { data: acceptedQuotes },
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('follow_up_reminders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('quotes').select('status, created_at').eq('organization_id', orgId).gte('created_at', startDateStr).limit(10000),
      supabase.from('quotes').select('total, accepted_at').eq('organization_id', orgId).eq('status', 'accepted').limit(10000),
    ])

    const totalRevenue = acceptedQuotes?.reduce((sum, q) => sum + (Number(q.total) || 0), 0) ?? 0

    const quoteStats = {
      draft: quotes?.filter(q => q.status === 'draft').length ?? 0,
      sent: quotes?.filter(q => q.status === 'sent').length ?? 0,
      accepted: quotes?.filter(q => q.status === 'accepted').length ?? 0,
      rejected: quotes?.filter(q => q.status === 'rejected').length ?? 0,
    }

    const totalDecided = quoteStats.accepted + quoteStats.rejected
    const conversionRate = totalDecided > 0
      ? ((quoteStats.accepted / totalDecided) * 100).toFixed(2)
      : '0.00'

    const summary: SummaryRow[] = [
      ['Total Clientes', String(totalClients ?? 0)],
      ['Total Cotizaciones', String(totalQuotes ?? 0)],
      ['Total Recordatorios', String(totalReminders ?? 0)],
      ['Ingresos Totales', `$${totalRevenue.toFixed(2)} MXN`],
      ['Cotizaciones en Período', String(quotes?.length ?? 0)],
    ]

    const statusRows: StatusRow[] = [
      ['Borradores', String(quoteStats.draft)],
      ['Enviadas', String(quoteStats.sent)],
      ['Aceptadas', String(quoteStats.accepted)],
      ['Rechazadas', String(quoteStats.rejected)],
    ]

    const pdfBuffer = await generateAnalyticsPDF({
      orgName,
      startDateStr,
      summary,
      statusRows,
      conversionRate,
    })

    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_analiticas_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
