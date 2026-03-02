import { StatsCardsGrid, StatsCard } from '@/components/dashboard/stats-cards'
import {
  FileText,
  Users,
  DollarSign,
  Bell,
} from 'lucide-react'

interface DashboardStatsProps {
  data: {
    summary: {
      total_clients: number
      total_quotes: number
      total_reminders: number
      total_services: number
    }
    quotes: {
      by_status: {
        draft: number
        sent: number
        viewed: number
        accepted: number
        rejected: number
        expired: number
      }
      conversion_rate: number
      response_rate: number
      avg_quote_value: number
    }
    revenue: {
      total: number
      this_month: number
      currency: string
    }
    reminders: {
      by_status: {
        pending: number
        sent: number
        completed: number
        snoozed: number
      }
      due_next_7_days: number
      overdue: number
    }
  }
}

export function DashboardStats({ data }: DashboardStatsProps) {
  const stats = [
    {
      title: 'Cotizaciones',
      value: data.summary.total_quotes,
      description: `${data.quotes.conversion_rate.toFixed(1)}% de conversión`,
      icon: FileText,
      trend: data.quotes.conversion_rate > 50
        ? { value: Math.round(data.quotes.conversion_rate - 50), isPositive: true }
        : undefined,
    },
    {
      title: 'Clientes',
      value: data.summary.total_clients,
      description: 'Clientes registrados',
      icon: Users,
    },
    {
      title: 'Ingresos del Mes',
      value: `$${data.revenue.this_month.toLocaleString('es-MX')}`,
      description: `Total: $${data.revenue.total.toLocaleString('es-MX')}`,
      icon: DollarSign,
      trend: data.revenue.this_month > 0
        ? { value: 100, isPositive: true }
        : undefined,
    },
    {
      title: 'Recordatorios Pendientes',
      value: data.reminders.by_status.pending,
      description: data.reminders.overdue > 0
        ? `${data.reminders.overdue} vencidos`
        : `${data.reminders.due_next_7_days} próximos 7 días`,
      icon: Bell,
    },
  ]

  return <StatsCardsGrid stats={stats} />
}
