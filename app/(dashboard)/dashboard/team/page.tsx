import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import Link from 'next/link'

interface Member {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export default async function TeamPage() {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: true })
    .limit(100)

  let invitations: Invitation[] = []
  if (['owner', 'admin'].includes(profile.role)) {
    const { data } = await supabase
      .from('invitations')
      .select('id, email, role, expires_at, accepted_at, created_at')
      .eq('organization_id', profile.organization_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    invitations = data || []
  }

  const roleLabels: Record<string, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    member: 'Miembro',
    viewer: 'Visualizador',
  }

  const roleBadgeColors: Record<string, string> = {
    owner: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    admin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    member: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    viewer: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  }

  const canInvite = ['owner', 'admin'].includes(profile.role)
  const adminCount = members?.filter(m => ['owner', 'admin'].includes(m.role)).length || 0

  return (
    <div className="space-y-4">
      {/* Header with inline stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Equipo</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{members?.length || 0} miembros</span>
              <span className="text-purple-600 dark:text-purple-400">{adminCount} admins</span>
              {canInvite && invitations.length > 0 && (
                <span className="text-orange-600 dark:text-orange-400">{invitations.length} invitaciones</span>
              )}
            </div>
          </div>
        </div>
        {canInvite && (
          <Link href="/dashboard/team/invite">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Invitar
            </Button>
          </Link>
        )}
      </div>

      {/* Pending Invitations */}
      {canInvite && invitations.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Invitaciones Pendientes</span>
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{invitations.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Expira</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-orange-50/40 dark:hover:bg-gray-800/40">
                    <td className="py-2.5 px-4 text-sm text-gray-900 dark:text-gray-100">{invitation.email}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadgeColors[invitation.role]}`}>
                        {roleLabels[invitation.role]}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {new Date(invitation.expires_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="text-right py-2.5 px-4">
                      <Link href={`/dashboard/team/invitations/${invitation.id}`} className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Miembros del Equipo</span>
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{members?.length || 0}</span>
        </div>
        {members && members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Miembro</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Email</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Desde</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-orange-50/40 dark:hover:bg-gray-800/40">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                            {member.full_name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.full_name || 'Sin nombre'}
                          {member.id === user.id && (
                            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">(T\u00fa)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{member.email}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadgeColors[member.role]}`}>
                        {roleLabels[member.role]}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {new Date(member.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="text-right py-2.5 px-4">
                      {member.id !== user.id && canInvite && (
                        <Link href={`/dashboard/team/members/${member.id}`} className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium">
                          Gestionar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No hay miembros en el equipo</p>
            {canInvite && (
              <div className="mt-4">
                <Link href="/dashboard/team/invite">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="w-4 h-4 mr-1" />
                    Invitar Primer Miembro
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
