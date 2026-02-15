import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Mail, Users, Clock } from 'lucide-react'
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

  // Fetch team members
  const { data: members } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: true })
    .limit(100)

  // Fetch invitations (only for admins/owners)
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
    owner: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    member: 'bg-green-100 text-green-700',
    viewer: 'bg-gray-100 text-gray-700',
  }

  const canInvite = ['owner', 'admin'].includes(profile.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Equipo</h2>
          <p className="text-gray-600">Gestiona los miembros de tu organización</p>
        </div>
        {canInvite && (
          <Link href="/dashboard/team/invite">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Invitar Miembro
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Miembros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <p className="text-3xl font-bold text-gray-900">{members?.length || 0}</p>
            </div>
          </CardContent>
        </Card>

        {canInvite && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Invitaciones Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <p className="text-3xl font-bold text-blue-600">{invitations.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Administradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <p className="text-3xl font-bold text-purple-600">
                    {members?.filter(m => ['owner', 'admin'].includes(m.role)).length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Pending Invitations */}
      {canInvite && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitaciones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Email</th>
                    <th className="text-left py-2 px-4">Rol</th>
                    <th className="text-left py-2 px-4">Expira</th>
                    <th className="text-right py-2 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{invitation.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          roleBadgeColors[invitation.role]
                        }`}>
                          {roleLabels[invitation.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(invitation.expires_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Link href={`/dashboard/team/invitations/${invitation.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          {members && members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Miembro</th>
                    <th className="text-left py-2 px-4">Email</th>
                    <th className="text-left py-2 px-4">Rol</th>
                    <th className="text-left py-2 px-4">Miembro desde</th>
                    <th className="text-right py-2 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {member.full_name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.full_name || 'Sin nombre'}
                              {member.id === user.id && (
                                <span className="ml-2 text-xs text-gray-500">(Tú)</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{member.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          roleBadgeColors[member.role]
                        }`}>
                          {roleLabels[member.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(member.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="text-right py-3 px-4">
                        {member.id !== user.id && canInvite && (
                          <Link href={`/dashboard/team/members/${member.id}`}>
                            <Button variant="outline" size="sm">
                              Gestionar
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay miembros en el equipo</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
