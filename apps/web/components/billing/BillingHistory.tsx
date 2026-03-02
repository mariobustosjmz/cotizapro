'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/stripe/helpers'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink } from 'lucide-react'

interface BillingRecord {
  id: string
  stripe_invoice_id: string
  amount: number
  currency: string
  status: string
  created_at: string
  pdf_url: string | null
  invoice_url: string | null
}

export function BillingHistory() {
  const [history, setHistory] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadBillingHistory = async () => {
      try {
        setLoading(true)
        setError(null)

        const supabase = createBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError('Not authenticated')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          setError('Organization not found')
          return
        }

        const { data, error: queryError } = await supabase
          .from('billing_history')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (queryError) {
          setError('Failed to load billing history')
          return
        }

        setHistory(data || [])
      } finally {
        setLoading(false)
      }
    }

    loadBillingHistory()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'void':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading billing history...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>
  }

  if (history.length === 0) {
    return <div className="text-center py-8 text-gray-500">No billing history yet</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Date
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Invoice
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Status
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((record) => (
            <tr key={record.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-700">
                {formatDate(record.created_at)}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-gray-600">
                {record.stripe_invoice_id}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {formatPrice(record.amount / 100, record.currency)}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                    record.status
                  )}`}
                >
                  {record.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right space-x-2">
                {record.pdf_url && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="inline-flex"
                  >
                    <a
                      href={record.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {record.invoice_url && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="inline-flex"
                  >
                    <a
                      href={record.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
