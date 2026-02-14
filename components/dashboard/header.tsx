'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  user: any
  profile: any
}

export function DashboardHeader({ user, profile }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (response.ok) {
      router.push('/login')
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Dashboard
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Quick Actions */}
        <Button
          onClick={() => router.push('/dashboard/quotes/new')}
          size="sm"
        >
          + Nueva Cotización
        </Button>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
        >
          Salir
        </Button>
      </div>
    </header>
  )
}
