import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

interface QuoteItemWithService {
  service_id: string
  service: {
    name: string
    category: string
  }
}

/**
 * GET /api/analytics/dashboard
 *
 * Returns comprehensive dashboard metrics for the authenticated user's organization.
 *
 * Metrics included:
 * - Total counts (clients, quotes, reminders)
 * - Quote conversion rates
 * - Revenue metrics
 * - Reminder statistics
 * - Recent activity
 * - Trends (week-over-week, month-over-month)
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

    const orgId = profile.organization_id

    // Parse date range from query params (default: last 30 days)
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split('T')[0]

    // ========================================
    // 1. Total Counts
    // ========================================

    const [
      { count: totalClients },
      { count: totalQuotes },
      { count: totalReminders },
      { count: totalServices },
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('follow_up_reminders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('service_catalog').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    ])

    // ========================================
    // 2. Quote Statistics by Status
    // ========================================

    const { data: quotesByStatus } = await supabase
      .from('quotes')
      .select('status')
      .eq('organization_id', orgId)
      .limit(10000)

    const quoteStats = {
      draft: quotesByStatus?.filter(q => q.status === 'draft').length || 0,
      sent: quotesByStatus?.filter(q => q.status === 'sent').length || 0,
      viewed: quotesByStatus?.filter(q => q.status === 'viewed').length || 0,
      accepted: quotesByStatus?.filter(q => q.status === 'accepted').length || 0,
      rejected: quotesByStatus?.filter(q => q.status === 'rejected').length || 0,
      expired: quotesByStatus?.filter(q => q.status === 'expired').length || 0,
    }

    // Conversion rate: accepted / (accepted + rejected)
    const totalDecided = quoteStats.accepted + quoteStats.rejected
    const conversionRate = totalDecided > 0
      ? ((quoteStats.accepted / totalDecided) * 100).toFixed(2)
      : '0.00'

    // ========================================
    // 3. Revenue Metrics
    // ========================================

    const { data: acceptedQuotes } = await supabase
      .from('quotes')
      .select('total, accepted_at')
      .eq('organization_id', orgId)
      .eq('status', 'accepted')
      .limit(10000)

    const totalRevenue = acceptedQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0

    // Revenue this month
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)
    const revenueThisMonth = acceptedQuotes?.filter(q =>
      q.accepted_at && new Date(q.accepted_at) >= firstDayOfMonth
    ).reduce((sum, q) => sum + (q.total || 0), 0) || 0

    // ========================================
    // 4. Reminder Statistics
    // ========================================

    const { data: reminders } = await supabase
      .from('follow_up_reminders')
      .select('status, priority, scheduled_date')
      .eq('organization_id', orgId)
      .limit(10000)

    const reminderStats = {
      pending: reminders?.filter(r => r.status === 'pending').length || 0,
      sent: reminders?.filter(r => r.status === 'sent').length || 0,
      completed: reminders?.filter(r => r.status === 'completed').length || 0,
      snoozed: reminders?.filter(r => r.status === 'snoozed').length || 0,
    }

    // Due reminders (today and next 7 days)
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekStr = nextWeek.toISOString().split('T')[0]

    const dueReminders = reminders?.filter(r =>
      r.status === 'pending' &&
      r.scheduled_date >= today &&
      r.scheduled_date <= nextWeekStr
    ).length || 0

    // Overdue reminders (past scheduled_date)
    const overdueReminders = reminders?.filter(r =>
      r.status === 'pending' &&
      r.scheduled_date < today
    ).length || 0

    // ========================================
    // 5. Recent Activity (last 30 days)
    // ========================================

    const { data: recentQuotes } = await supabase
      .from('quotes')
      .select('created_at')
      .eq('organization_id', orgId)
      .gte('created_at', startDateStr)
      .limit(1000)

    const { data: recentClients } = await supabase
      .from('clients')
      .select('created_at')
      .eq('organization_id', orgId)
      .gte('created_at', startDateStr)
      .limit(1000)

    const recentActivity = {
      new_clients: recentClients?.length || 0,
      new_quotes: recentQuotes?.length || 0,
      period_days: daysBack,
    }

    // ========================================
    // 6. Top Services (most used in quotes)
    // ========================================

    const { data: quoteItems } = await supabase
      .from('quote_items')
      .select(`
        service_id,
        service:service_catalog(name, category)
      `)
      .not('service_id', 'is', null)
      .limit(5000) as { data: QuoteItemWithService[] | null }

    // Count service usage
    const serviceCounts: { [key: string]: { count: number; name: string; category: string } } = {}
    quoteItems?.forEach(item => {
      if (item.service_id && item.service) {
        if (!serviceCounts[item.service_id]) {
          serviceCounts[item.service_id] = {
            count: 0,
            name: item.service.name,
            category: item.service.category,
          }
        }
        serviceCounts[item.service_id].count++
      }
    })

    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => ({
        name: s.name,
        category: s.category,
        usage_count: s.count,
      }))

    // ========================================
    // 7. Average Quote Value
    // ========================================

    const { data: allQuotes } = await supabase
      .from('quotes')
      .select('total')
      .eq('organization_id', orgId)
      .neq('status', 'draft')
      .limit(10000)

    const avgQuoteValue = allQuotes && allQuotes.length > 0
      ? allQuotes.reduce((sum, q) => sum + (q.total || 0), 0) / allQuotes.length
      : 0

    // ========================================
    // 8. Response Rate (viewed / sent)
    // ========================================

    const viewedOrBetter = quoteStats.viewed + quoteStats.accepted + quoteStats.rejected
    const sentTotal = quoteStats.sent + viewedOrBetter
    const responseRate = sentTotal > 0
      ? ((viewedOrBetter / sentTotal) * 100).toFixed(2)
      : '0.00'

    // ========================================
    // Compile Response
    // ========================================

    return NextResponse.json({
      summary: {
        total_clients: totalClients || 0,
        total_quotes: totalQuotes || 0,
        total_reminders: totalReminders || 0,
        total_services: totalServices || 0,
      },
      quotes: {
        by_status: quoteStats,
        conversion_rate: parseFloat(conversionRate),
        response_rate: parseFloat(responseRate),
        avg_quote_value: Number(avgQuoteValue.toFixed(2)),
      },
      revenue: {
        total: Number(totalRevenue.toFixed(2)),
        this_month: Number(revenueThisMonth.toFixed(2)),
        currency: 'MXN',
      },
      reminders: {
        by_status: reminderStats,
        due_next_7_days: dueReminders,
        overdue: overdueReminders,
      },
      recent_activity: recentActivity,
      top_services: topServices,
      period: {
        start_date: startDateStr,
        end_date: new Date().toISOString().split('T')[0],
        days: daysBack,
      },
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
