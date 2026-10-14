import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { ProfileForm } from '@/components/showcase-editor/profile-form'
import { ReviewReplies } from '@/components/showcase-editor/review-replies'
import { SharePanel } from '@/components/showcase-editor/share-panel'
import { AccountSetupForm } from '@/components/onboarding/account-setup-form'
import { getOwnShowcase } from '@/lib/showcase/get-own-profile'
import { publicProfileUrl, qrDataUrl } from '@/lib/showcase/public-url'
import { getReviewsForReply, type ReviewsForReplyResult } from '@/lib/showcase/review-replies'

const NO_REVIEWS: ReviewsForReplyResult = { reviews: [], failed: false }

export const dynamic = 'force-dynamic'

function Card({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </section>
  )
}

export default async function ShowcaseEditorPage() {
  const showcase = await getOwnShowcase()
  if (!showcase) redirect('/login')
  const host = (await headers()).get('host')
  const url = publicProfileUrl(showcase.slug, host ? `http://${host}` : undefined)
  const canEdit = showcase.role === 'owner' || showcase.role === 'admin'
  const [qrPng, replies] = await Promise.all([
    qrDataUrl(url, 360),
    canEdit ? getReviewsForReply(showcase.db, showcase.organizationId) : Promise.resolve(NO_REVIEWS),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mi página pública</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tu vitrina: trabajos, reseñas verificadas y un botón para pedirte cotización. Compártela por WhatsApp o con tu tarjeta QR.
        </p>
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4">
          <Card title="Datos de la página">
            <ProfileForm profile={showcase.profile} fallbackName={showcase.orgName} canEdit={canEdit} />
          </Card>
          {canEdit && (
            <Card title="Respuestas a reseñas">
              <ReviewReplies reviews={replies.reviews} failed={replies.failed} />
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Compartir">
            <SharePanel url={url} qrPng={qrPng} published={showcase.profile?.is_published ?? false} />
          </Card>
          {showcase.role === 'owner' && (
            <Card title="Tipo de cuenta y giro">
              <AccountSetupForm initialAccountType={showcase.accountType} initialTrade={showcase.trade} applyTemplateByDefault={false} redirectTo="/dashboard/vitrina" compact />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
