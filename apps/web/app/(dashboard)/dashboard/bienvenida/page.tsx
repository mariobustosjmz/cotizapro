import { redirect } from 'next/navigation'
import { AccountSetupForm } from '@/components/onboarding/account-setup-form'
import { getAccountSetup } from '@/lib/onboarding/get-account-setup'

export const dynamic = 'force-dynamic'

export default async function WelcomeSetupPage() {
  const setup = await getAccountSetup()
  if (!setup) redirect('/login')
  if (setup.role !== 'owner') redirect('/dashboard')

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configura tu cuenta</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          CotizaPro sirve igual para una persona de oficio, un equipo o una empresa. Con esto preparamos tus productos, precios y tu página pública.
        </p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <AccountSetupForm
          initialAccountType={setup.accountType}
          initialTrade={setup.trade}
          applyTemplateByDefault={!setup.onboardingCompleted}
          redirectTo="/dashboard/vitrina"
          cancelHref="/dashboard"
        />
      </div>
    </div>
  )
}
