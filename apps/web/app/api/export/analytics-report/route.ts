import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/export/analytics-report
 *
 * Generate and download comprehensive analytics PDF report
 *
 * Query parameters:
 * - period: "week" | "month" | "quarter" | "year" (default: "month")
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
      .select('organization_id, organizations(name)')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const orgId = profile.organization_id
    const orgName = (profile.organizations as any)?.name || 'Mi Organización'

    // Parse period
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

    // Fetch analytics data
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

    const totalRevenue = acceptedQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0

    // Create PDF
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.text('Reporte de Analíticas', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.text(orgName, 105, 30, { align: 'center' })

    doc.setFontSize(10)
    doc.text(`Período: ${new Date(startDateStr).toLocaleDateString('es-MX')} - ${new Date().toLocaleDateString('es-MX')}`, 105, 38, { align: 'center' })

    // Summary table
    autoTable(doc, {
      startY: 50,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total Clientes', String(totalClients || 0)],
        ['Total Cotizaciones', String(totalQuotes || 0)],
        ['Total Recordatorios', String(totalReminders || 0)],
        ['Ingresos Totales', `$${totalRevenue.toFixed(2)} MXN`],
        ['Cotizaciones en Período', String(quotes?.length || 0)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    })

    // Quote status breakdown
    const quoteStats = {
      draft: quotes?.filter(q => q.status === 'draft').length || 0,
      sent: quotes?.filter(q => q.status === 'sent').length || 0,
      accepted: quotes?.filter(q => q.status === 'accepted').length || 0,
      rejected: quotes?.filter(q => q.status === 'rejected').length || 0,
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Estado de Cotizaciones', 'Cantidad']],
      body: [
        ['Borradores', String(quoteStats.draft)],
        ['Enviadas', String(quoteStats.sent)],
        ['Aceptadas', String(quoteStats.accepted)],
        ['Rechazadas', String(quoteStats.rejected)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
    })

    // Conversion rate
    const totalDecided = quoteStats.accepted + quoteStats.rejected
    const conversionRate = totalDecided > 0
      ? ((quoteStats.accepted / totalDecided) * 100).toFixed(2)
      : '0.00'

    doc.setFontSize(12)
    doc.text(`Tasa de Conversión: ${conversionRate}%`, 20, (doc as any).lastAutoTable.finalY + 15)

    // Footer
    doc.setFontSize(8)
    doc.text(`Generado el ${new Date().toLocaleString('es-MX')}`, 105, 280, { align: 'center' })
    doc.text('CotizaPro - Sistema de Gestión de Cotizaciones', 105, 285, { align: 'center' })

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Return as downloadable file
    return new NextResponse(pdfBuffer, {
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
