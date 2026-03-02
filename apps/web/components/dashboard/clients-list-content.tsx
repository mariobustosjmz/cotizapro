'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Users, Plus, Phone, Mail } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { ClientSearchInput } from '@/app/(dashboard)/dashboard/clients/search-input'

interface Client {
  id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  tags: string[] | null
  created_at: string
}

interface ClientsListContentProps {
  initialSearch?: string
}

const ITEMS_PER_PAGE = 20

export function ClientsListContent({ initialSearch = '' }: ClientsListContentProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(initialSearch)

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: ITEMS_PER_PAGE.toString(),
          offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
        })

        if (searchTerm) {
          params.append('search', searchTerm)
        }

        const response = await fetch(`/api/clients?${params.toString()}`)
        const result = await response.json()

        if (result.clients) {
          setClients(result.clients)
          setTotal(result.total || 0)
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [currentPage, searchTerm])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  if (loading && currentPage === 1) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-8 text-center">
          <div className="animate-pulse flex justify-center">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lista de Clientes</span>
        <ClientSearchInput defaultValue={searchTerm} onSearch={handleSearch} />
      </div>

      {!clients || clients.length === 0 ? (
        <div className="text-center py-10">
          <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No hay clientes'}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Intenta con otro término' : 'Comienza agregando tu primer cliente'}
          </p>
          {!searchTerm && (
            <div className="mt-4">
              <Link href="/dashboard/clients/new">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo Cliente
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50/60 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Nombre
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Contacto
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                    Dirección
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">
                    Etiquetas
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-orange-50/40 dark:hover:bg-gray-800 cursor-pointer group">
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</div>
                      {client.company_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{client.company_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        {client.phone && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                            <Phone className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-500" />
                            {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                            <Mail className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-500" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="text-xs text-gray-600 dark:text-gray-300 max-w-[200px] sm:max-w-xs truncate">
                        {client.address || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {client.tags && client.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <Badge key={idx} className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {client.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">+{client.tags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="inline-flex items-center justify-center px-2 py-1.5 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium rounded"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={total}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}
