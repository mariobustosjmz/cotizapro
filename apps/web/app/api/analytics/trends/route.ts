import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/analytics/trends
 *
 * Returns time-series data for dashboard charts.
 *
 * Query parameters:
 * - period: "week" | "month" | "quarter" | "year" (default: "month")
 * - metric: "quotes" | "revenue" | "clients" | "reminders" (default: "all")
 *
 * Returns data grouped by time intervals (days, weeks, or months)
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month'
    const metric = searchParams.get('metric') || 'all'

    // Calculate date range based on period
    let daysBack: number
    let groupBy: 'day' | 'week' | 'month'

    switch (period) {
      case 'week':
        daysBack = 7
        groupBy = 'day'
        break
      case 'quarter':
        daysBack = 90
        groupBy = 'week'
        break
      case 'year':
        daysBack = 365
        groupBy = 'month'
        break
      case 'month':
      default:
        daysBack = 30
        groupBy = 'day'
        break
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split('T')[0]

    // ========================================
    // Helper function to group data by time
    // ========================================

    interface TimeSeriesDataItem {
      [key: string]: any // Allow any fields, but we only access dateField
    }

    function groupByTime(data: TimeSeriesDataItem[], dateField: string) {
      const groups: { [key: string]: number } = {}

      data.forEach(item => {
        const date = new Date(item[dateField])
        let key: string

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0]
        } else if (groupBy === 'week') {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        }

        groups[key] = (groups[key] || 0) + 1
      })

      return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }))
    }

    // ========================================
    // Fetch data based on metric
    // ========================================

    interface TrendsData {
      quotes?: {
        total: { date: string; count: number }[]
        accepted: { date: string; count: number }[]
      }
      revenue?: { date: string; amount: number }[]
      clients?: { date: string; count: number }[]
      reminders?: {
        created: { date: string; count: number }[]
        completed: { date: string; count: number }[]
      }
    }

    const trends: TrendsData = {}

    if (metric === 'quotes' || metric === 'all') {
      // Quotes created over time
      const { data: quotes } = await supabase
        .from('quotes')
        .select('created_at, status, total')
        .eq('organization_id', orgId)
        .gte('created_at', startDateStr)
        .limit(10000)

      trends.quotes = {
        total: groupByTime(quotes || [], 'created_at'),
        accepted: groupByTime(
          quotes?.filter(q => q.status === 'accepted') || [],
          'created_at'
        ),
      }
    }

    if (metric === 'revenue' || metric === 'all') {
      // Revenue over time (accepted quotes)
      const { data: acceptedQuotes } = await supabase
        .from('quotes')
        .select('accepted_at, total')
        .eq('organization_id', orgId)
        .eq('status', 'accepted')
        .gte('accepted_at', startDateStr)
        .limit(10000)

      const revenueByDate: { [key: string]: number } = {}

      acceptedQuotes?.forEach(quote => {
        if (!quote.accepted_at) return

        const date = new Date(quote.accepted_at)
        let key: string

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0]
        } else if (groupBy === 'week') {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        }

        revenueByDate[key] = (revenueByDate[key] || 0) + (quote.total || 0)
      })

      trends.revenue = Object.entries(revenueByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amount]) => ({ date, amount: Number(amount.toFixed(2)) }))
    }

    if (metric === 'clients' || metric === 'all') {
      // New clients over time
      const { data: clients } = await supabase
        .from('clients')
        .select('created_at')
        .eq('organization_id', orgId)
        .gte('created_at', startDateStr)
        .limit(10000)

      trends.clients = groupByTime(clients || [], 'created_at')
    }

    if (metric === 'reminders' || metric === 'all') {
      // Reminders created and completed over time
      const { data: reminders } = await supabase
        .from('follow_up_reminders')
        .select('created_at, completed_at, status')
        .eq('organization_id', orgId)
        .gte('created_at', startDateStr)
        .limit(10000)

      trends.reminders = {
        created: groupByTime(reminders || [], 'created_at'),
        completed: groupByTime(
          reminders?.filter(r => r.completed_at) || [],
          'completed_at'
        ),
      }
    }

    return NextResponse.json({
      trends,
      period: {
        type: period,
        days_back: daysBack,
        group_by: groupBy,
        start_date: startDateStr,
        end_date: new Date().toISOString().split('T')[0],
      },
    })
  } catch (error) {
    console.error('Trends analytics error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
