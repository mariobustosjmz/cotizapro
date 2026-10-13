import Link from 'next/link'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { BrandMark } from '@/components/brand/brand-mark'
import { AcceptInviteButton } from '@/components/team/accept-invite-button'
import { INVITE_TOKEN_PATTERN } from '@/lib/team/invitation-errors'
import { roleLabel } from '@/lib/team/roles'

interface PageProps {
  readonly params: Promise<{ token: string }>
}

const previewSchema = z.object({
  organization_name: z.string(),
  role: z.string(),
  email_hint: z.string(),
  status: z.enum(['pending', 'accepted', 'expired']),
})

function Shell({ children }: { readonly children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-semibold text-gray-900">CotizaPro</span>
        </div>
        {children}
      </div>
    </main>
  )
}

function Notice({ title, text }: { readonly title: string; readonly text: string }) {
  return (
    <Shell>
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-600">{text}</p>
      <Link href="/login" className="inline-block text-sm font-medium text-orange-600 hover:underline">Ir a iniciar sesión</Link>
    </Shell>
  )
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params
  if (!INVITE_TOKEN_PATTERN.test(token)) return <Notice title="Invitación no válida" text="Revisa que la liga esté completa o pide una nueva a quien te invitó." />

  const supabase = await createServerClient()
  const { data } = await supabase.rpc('get_invitation_preview', { p_token: token })
  const preview = previewSchema.safeParse(data)
  if (!preview.success) return <Notice title="Invitación no válida" text="Revisa que la liga esté completa o pide una nueva a quien te invitó." />
  if (preview.data.status === 'accepted') return <Notice title="Invitación ya aceptada" text="Esta invitación ya se usó. Entra con tu cuenta." />
  if (preview.data.status === 'expired') return <Notice title="Invitación vencida" text="Las invitaciones duran 7 días. Pide una nueva a quien te invitó." />

  const { data: { user } } = await supabase.auth.getUser()
  const { organization_name: organization, email_hint: emailHint } = preview.data
  const role = roleLabel(preview.data.role)
  const next = encodeURIComponent(`/invite/${token}`)

  return (
    <Shell>
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-gray-900">Te invitaron a {organization}</h1>
        <p className="text-sm text-gray-600">Rol: <span className="font-medium text-gray-900">{role}</span></p>
        <p className="text-sm text-gray-600">Para el correo <span className="font-mono text-gray-900">{emailHint}</span></p>
      </div>
      {user ? (
        <AcceptInviteButton token={token} />
      ) : (
        <div className="space-y-2">
          <Link href={`/signup?invite=${token}`} className="flex w-full items-center justify-center rounded-md bg-orange-500 px-4 h-10 text-sm font-medium text-white hover:bg-orange-600">
            Crear mi cuenta y unirme
          </Link>
          <Link href={`/login?next=${next}`} className="flex w-full items-center justify-center rounded-md border border-gray-300 px-4 h-10 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Ya tengo cuenta
          </Link>
          <p className="text-xs text-gray-500">Usa el mismo correo al que llegó la invitación.</p>
        </div>
      )}
    </Shell>
  )
}
