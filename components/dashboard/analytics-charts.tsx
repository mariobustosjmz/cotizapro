'use client'

import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuoteStatusData {
  status: string
  count: number
}

interface WeeklyBreakdown {
  week: string
  total_paid: number
  date_range: string
}

interface ChartData {
  quotes_by_status: QuoteStatusData[]
  weekly_revenue: WeeklyBreakdown[]
  monthly_trend: Array<{ month: string; revenue: number; quotes: number }>
  conversion_funnel: Array<{ stage: string; count: number; color: string }>
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF',
  sent: '#3B82F6',
  viewed: '#8B5CF6',
  accepted: '#10B981',
  rejected: '#EF4444',
  expired: '#F59E0B',
  en_instalacion: '#06B6D4',
  completado: '#14B8A6',
  cobrado: '#22C55E',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviadas',
  viewed: 'Vistas',
  accepted: 'Aceptadas',
  rejected: 'Rechazadas',
  expired: 'Expiradas',
  en_instalacion: 'Instalacion',
  completado: 'Completadas',
  cobrado: 'Cobradas',
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-MX')}`
}

interface QuoteStatusChartProps {
  data: QuoteStatusData[]
}

function QuoteStatusDonut({ data }: QuoteStatusChartProps) {
  const filtered = data.filter(d => d.count > 0)
  const total = filtered.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-500">
        Sin datos
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-48 h-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
              dataKey="count"
              nameKey="status"
              stroke="none"
            >
              {filtered.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#9CA3AF'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, props) => [
                value as number,
                STATUS_LABELS[(props.payload as QuoteStatusData).status] || (props.payload as QuoteStatusData).status,
              ]}
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                padding: '6px 10px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {filtered.map((entry) => (
          <div key={entry.status} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLORS[entry.status] || '#9CA3AF' }}
            />
            <span className="text-gray-600 dark:text-gray-400 truncate">
              {STATUS_LABELS[entry.status] || entry.status}
            </span>
            <span className="font-semibold text-gray-900 dark:text-white ml-auto">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface RevenueBarChartProps {
  data: WeeklyBreakdown[]
}

function RevenueBarChart({ data }: RevenueBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-500">
        Sin datos de ingresos
      </div>
    )
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value as number), 'Cobrado']}
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
              padding: '6px 10px',
            }}
          />
          <Bar dataKey="total_paid" fill="#F97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface ConversionFunnelProps {
  data: Array<{ stage: string; count: number; color: string }>
}

function ConversionFunnel({ data }: ConversionFunnelProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="space-y-2">
      {data.map((stage) => {
        const pct = (stage.count / maxCount) * 100
        return (
          <div key={stage.stage} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">{stage.stage}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{stage.count}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AnalyticsCharts() {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month'>('month')

  useEffect(() => {
    fetchChartData()
  }, [period])

  async function fetchChartData() {
    setLoading(true)
    try {
      const [dashboardRes, incomeRes] = await Promise.all([
        fetch('/api/analytics/dashboard'),
        fetch(`/api/analytics/income?period=${period}&compare=true`),
      ])

      if (!dashboardRes.ok || !incomeRes.ok) {
        throw new Error('Error fetching chart data')
      }

      const dashboard = await dashboardRes.json()
      const income = await incomeRes.json()

      const byStatus = dashboard.quotes?.by_status
      const quotesStatusArray: QuoteStatusData[] = byStatus
        ? (typeof byStatus === 'object' && !Array.isArray(byStatus))
          ? Object.entries(byStatus).map(([status, count]) => ({
              status,
              count: count as number,
            }))
          : byStatus
        : []

      const totalQuotes = quotesStatusArray.reduce((s, q) => s + q.count, 0)
      const sent = quotesStatusArray.find(q => q.status === 'sent')?.count || 0
      const viewed = quotesStatusArray.find(q => q.status === 'viewed')?.count || 0
      const accepted = quotesStatusArray.find(q => q.status === 'accepted')?.count || 0
      const cobrado = quotesStatusArray.find(q => q.status === 'cobrado')?.count || 0

      const funnel = [
        { stage: 'Creadas', count: totalQuotes, color: '#6B7280' },
        { stage: 'Enviadas', count: sent + viewed + accepted + cobrado, color: '#3B82F6' },
        { stage: 'Vistas', count: viewed + accepted + cobrado, color: '#8B5CF6' },
        { stage: 'Aceptadas', count: accepted + cobrado, color: '#10B981' },
        { stage: 'Cobradas', count: cobrado, color: '#22C55E' },
      ]

      setChartData({
        quotes_by_status: quotesStatusArray,
        weekly_revenue: income.data?.weekly_breakdown || [],
        monthly_trend: [],
        conversion_funnel: funnel,
      })
    } catch {
      setChartData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2].map(i => (
          <div key={i} className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center h-64 ${i === 2 ? 'md:col-span-2' : ''}`}>
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ))}
      </div>
    )
  }

  if (!chartData) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {/* Donut Chart — Quote Status Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Distribucion de Cotizaciones
            </span>
          </div>
          <div className="p-4">
            <QuoteStatusDonut data={chartData.quotes_by_status} />
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Embudo de Conversion
            </span>
          </div>
          <div className="p-4">
            <ConversionFunnel data={chartData.conversion_funnel} />
          </div>
        </div>
      </div>

      {/* Revenue Bar Chart — Full Width */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Ingresos por Semana
          </span>
          <div className="flex gap-1">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('week')}
              className="h-6 text-[10px] px-2"
            >
              Semana
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
              className="h-6 text-[10px] px-2"
            >
              Mes
            </Button>
          </div>
        </div>
        <div className="p-4">
          <RevenueBarChart data={chartData.weekly_revenue} />
        </div>
      </div>
    </div>
  )
}
