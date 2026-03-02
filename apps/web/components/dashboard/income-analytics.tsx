'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'

interface IncomeAnalyticsResponse {
  data: {
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
}

type Period = 'week' | 'month'

export function IncomeAnalytics() {
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<IncomeAnalyticsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchIncomeAnalytics()
  }, [period])

  async function fetchIncomeAnalytics() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/analytics/income?period=${period}&compare=true`
      )
      if (!response.ok) {
        throw new Error('Error al cargar analíticas de ingresos')
      }
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-700">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const maxWeeklyValue = data.weekly_breakdown
    ? Math.max(...data.weekly_breakdown.map(w => w.total_paid), 1)
    : 1

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Análisis Detallado de Ingresos</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('week')}
            className="text-xs"
          >
            Semana
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
            className="text-xs"
          >
            Mes
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Cobrado este Período */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
              Cobrado {period === 'week' ? 'esta Semana' : 'este Mes'}
            </p>
            <p className="text-2xl font-bold text-green-700">
              ${data.current_period.total_paid.toLocaleString('es-MX')}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {data.current_period.start_date} a {data.current_period.end_date}
            </p>
          </div>

          {/* Cambio vs Período Anterior */}
          {data.previous_period && data.change_pct !== undefined && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                vs Período Anterior
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-blue-700">
                  {Math.abs(data.change_pct)}%
                </p>
                {data.change_pct >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Anterior: ${data.previous_period.total_paid.toLocaleString('es-MX')}
              </p>
            </div>
          )}

          {/* Saldo Pendiente */}
          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
              Saldo Pendiente
            </p>
            <p className="text-2xl font-bold text-orange-700">
              ${data.pending_balance.toLocaleString('es-MX')}
            </p>
            <p className="text-xs text-gray-500 mt-2">Por cobrar</p>
          </div>

          {/* Pipeline Total */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
              Pipeline Total
            </p>
            <p className="text-2xl font-bold text-purple-700">
              ${data.pipeline_value.toLocaleString('es-MX')}
            </p>
            <p className="text-xs text-gray-500 mt-2">En trabajo</p>
          </div>
        </div>

        {/* Weekly Breakdown Chart */}
        {data.weekly_breakdown && data.weekly_breakdown.length > 0 && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Desglose por Semana
            </h3>
            <div className="space-y-4">
              {data.weekly_breakdown.map((week) => {
                const percentage =
                  maxWeeklyValue > 0
                    ? (week.total_paid / maxWeeklyValue) * 100
                    : 0

                return (
                  <div key={week.week} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {week.week}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          ${week.total_paid.toLocaleString('es-MX')}
                        </span>
                        <p className="text-xs text-gray-500">{week.date_range}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
