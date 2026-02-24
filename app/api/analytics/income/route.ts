import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const incomeAnalyticsQuerySchema = z.object({
  period: z.enum(['week', 'month']).default('month'),
  compare: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
})

type IncomeAnalyticsResponse = {
  current_period: {
    total_paid: number
    start_date: string
    end_date: string
  }
  previous_period?: {
    total_paid: number
    start_date: string
    end_date: string
  }
  change_pct?: number
  weekly_breakdown?: Array<{
    week: string
    total_paid: number
    date_range: string
  }>
  pipeline_value: number
  pending_balance: number
}

export async function GET(request: NextRequest) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for income analytics', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/analytics/income - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/analytics/income')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/analytics/income')
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const queryValidation = incomeAnalyticsQuerySchema.safeParse({
      period: searchParams.get('period'),
      compare: searchParams.get('compare'),
    })

    if (!queryValidation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: queryValidation.error.issues,
      }, { status: 400 })
    }

    const { period, compare } = queryValidation.data

    // Calculate date ranges
    const now = new Date()
    let currentPeriodStart: Date
    let currentPeriodEnd: Date
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    if (period === 'month') {
      // Current month
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Previous month
      previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1)
      previousPeriodStart = new Date(previousPeriodEnd.getFullYear(), previousPeriodEnd.getMonth(), 1)
    } else {
      // Current week (Monday to Sunday)
      const dayOfWeek = now.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      currentPeriodStart = new Date(now)
      currentPeriodStart.setDate(now.getDate() - daysToMonday)
      currentPeriodStart.setHours(0, 0, 0, 0)

      currentPeriodEnd = new Date(currentPeriodStart)
      currentPeriodEnd.setDate(currentPeriodStart.getDate() + 6)
      currentPeriodEnd.setHours(23, 59, 59, 999)

      // Previous week
      previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1)
      previousPeriodStart = new Date(previousPeriodEnd)
      previousPeriodStart.setDate(previousPeriodEnd.getDate() - 6)
      previousPeriodStart.setHours(0, 0, 0, 0)
    }

    const formatDateISO = (date: Date) => date.toISOString().split('T')[0]

    // Query actual collected payments in current period
    logger.database('SELECT', 'quote_payments', { orgId: profile.organization_id })
    const { data: currentPayments, error: currentPaymentsError } = await supabase
      .from('quote_payments')
      .select('amount')
      .eq('organization_id', profile.organization_id)
      .gte('payment_date', formatDateISO(currentPeriodStart))
      .lte('payment_date', formatDateISO(currentPeriodEnd))

    if (currentPaymentsError) {
      logger.error('Error fetching current period payments', currentPaymentsError, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch income data'),
        'GET /api/analytics/income - current payments'
      )
    }

    const currentTotalPaid = currentPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    // Query previous period if compare is true
    let previousTotalPaid = 0
    let changePct: number | undefined

    if (compare) {
      const { data: previousPayments, error: previousPaymentsError } = await supabase
        .from('quote_payments')
        .select('amount')
        .eq('organization_id', profile.organization_id)
        .gte('payment_date', formatDateISO(previousPeriodStart))
        .lte('payment_date', formatDateISO(previousPeriodEnd))

      if (previousPaymentsError) {
        logger.error('Error fetching previous period payments', previousPaymentsError, { orgId: profile.organization_id })
      } else {
        previousTotalPaid = previousPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
        // Calculate percentage change
        if (previousTotalPaid === 0) {
          changePct = currentTotalPaid > 0 ? 100 : 0
        } else {
          changePct = Math.round(((currentTotalPaid - previousTotalPaid) / previousTotalPaid) * 100)
        }
      }
    }

    // Get weekly breakdown if period is month
    let weeklyBreakdown: Array<{ week: string; total_paid: number; date_range: string }> | undefined

    if (period === 'month') {
      const weeks: Array<{ week: string; total_paid: number; date_range: string }> = []
      let weekStart = new Date(currentPeriodStart)

      while (weekStart <= currentPeriodEnd) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        if (weekEnd > currentPeriodEnd) {
          weekEnd.setTime(currentPeriodEnd.getTime())
        }

        const { data: weekPayments, error: weekError } = await supabase
          .from('quote_payments')
          .select('amount')
          .eq('organization_id', profile.organization_id)
          .gte('payment_date', formatDateISO(weekStart))
          .lte('payment_date', formatDateISO(weekEnd))

        if (!weekError) {
          const weekTotal = weekPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
          const weekNum = Math.ceil(weekStart.getDate() / 7)
          weeks.push({
            week: `Semana ${weekNum}`,
            total_paid: weekTotal,
            date_range: `${formatDateISO(weekStart)} a ${formatDateISO(weekEnd)}`,
          })
        }

        weekStart = new Date(weekEnd)
        weekStart.setDate(weekEnd.getDate() + 1)
      }

      weeklyBreakdown = weeks
    }

    // Query pipeline value: accepted + en_instalacion quotes
    logger.database('SELECT', 'quotes', { orgId: profile.organization_id })
    const { data: pipelineQuotes, error: pipelineError } = await supabase
      .from('quotes')
      .select('total')
      .eq('organization_id', profile.organization_id)
      .in('status', ['accepted', 'en_instalacion'])

    if (pipelineError) {
      logger.error('Error fetching pipeline quotes', pipelineError, { orgId: profile.organization_id })
    }

    const pipelineValue = pipelineQuotes?.reduce((sum, q) => sum + Number(q.total), 0) || 0

    // Query pending balance: total of all quotes minus total payments
    const { data: allQuotes, error: allQuotesError } = await supabase
      .from('quotes')
      .select('total')
      .eq('organization_id', profile.organization_id)
      .in('status', ['accepted', 'en_instalacion', 'installed'])

    if (allQuotesError) {
      logger.error('Error fetching all quotes for pending balance', allQuotesError, { orgId: profile.organization_id })
    }

    const totalQuoteAmount = allQuotes?.reduce((sum, q) => sum + Number(q.total), 0) || 0

    const { data: allTimePayments, error: allTimeError } = await supabase
      .from('quote_payments')
      .select('amount')
      .eq('organization_id', profile.organization_id)

    const allTimePaid = allTimePayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const pendingBalance = Math.max(0, totalQuoteAmount - allTimePaid)

    const response: IncomeAnalyticsResponse = {
      current_period: {
        total_paid: currentTotalPaid,
        start_date: formatDateISO(currentPeriodStart),
        end_date: formatDateISO(currentPeriodEnd),
      },
      ...(compare && {
        previous_period: {
          total_paid: previousTotalPaid,
          start_date: formatDateISO(previousPeriodStart),
          end_date: formatDateISO(previousPeriodEnd),
        },
        change_pct: changePct,
      }),
      ...(weeklyBreakdown && { weekly_breakdown: weeklyBreakdown }),
      pipeline_value: pipelineValue,
      pending_balance: pendingBalance,
    }

    logger.info('Income analytics retrieved successfully', {
      orgId: profile.organization_id,
      period,
      currentTotalPaid,
    })
    return NextResponse.json({ data: response })
  } catch (error) {
    logger.error('Unexpected error in GET /api/analytics/income', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/analytics/income'
    )
  }
}
