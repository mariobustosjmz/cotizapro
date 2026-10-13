import Link from 'next/link'
import { EXTRA_USER_MONTHLY_PRICE, PLANS, PLAN_ORDER, PRICES_INCLUDE_VAT, UPCOMING_FEATURES } from '@/lib/plans/catalog'
import { formatMxn, usersLabel } from '@/lib/plans/pricing'
import type { Plan } from '@/lib/plans/types'

const FOUNDERS_DISCOUNT = '40 %'
const FOUNDERS_SLOTS = 20

function CheckIcon({ className }: { readonly className: string }) {
  return (
    <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlanCard({ plan }: { readonly plan: Plan }) {
  const dark = plan.highlighted
  return (
    <div
      data-testid={`landing-plan-${plan.id}`}
      className={`relative flex flex-col rounded-2xl p-6 ${dark ? 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-2xl' : 'bg-white border border-slate-200'}`}
    >
      {dark && (
        <span className="absolute top-4 right-4 text-xs font-bold bg-orange-500 text-white px-3 py-1 rounded-full">Recomendado</span>
      )}
      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${dark ? 'text-blue-200' : 'text-slate-500'}`}>{plan.name}</p>
      <div className="flex items-baseline gap-1 mb-1">
        <span className={`text-4xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{formatMxn(plan.monthlyPrice)}</span>
        <span className={`text-sm ${dark ? 'text-blue-200' : 'text-slate-500'}`}>/mes</span>
      </div>
      <p className={`text-xs mb-1 ${dark ? 'text-blue-100' : 'text-slate-600'}`}>{plan.tagline}</p>
      <p className={`text-xs mb-5 ${dark ? 'text-blue-200' : 'text-slate-500'}`}>{usersLabel(plan.id)}</p>
      <Link href="/signup">
        <span className={`block text-center w-full font-semibold py-3 rounded-xl text-sm transition-colors cursor-pointer mb-6 ${dark ? 'btn-glow-orange bg-orange-500 hover:bg-orange-600 text-white' : 'border border-slate-300 hover:border-slate-400 text-slate-700'}`}>
          Empieza gratis
        </span>
      </Link>
      <ul className="space-y-3 flex-1">
        {plan.features.map((item) => (
          <li key={item} className={`flex items-start gap-2.5 text-sm ${dark ? 'text-white' : 'text-slate-600'}`}>
            <CheckIcon className={dark ? 'text-blue-200' : 'text-green-500'} />
            {item}
          </li>
        ))}
        {plan.upcoming.map((item) => (
          <li key={item} className={`flex items-start gap-2.5 text-sm ${dark ? 'text-blue-200' : 'text-slate-400'}`}>
            <span className="w-4 flex-shrink-0 text-center" aria-hidden="true">·</span>
            <span>
              {item}{' '}
              <span className={`text-[10px] font-bold uppercase ${dark ? 'text-orange-300' : 'text-orange-600'}`}>Próximamente</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PricingSection() {
  return (
    <section id="precios" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Planes para cada tamaño de negocio</h2>
          <p className="text-lg text-slate-600">
            Empieza gratis. Los planes de equipo incluyen usuarios y, si creces, cada persona adicional cuesta {formatMxn(EXTRA_USER_MONTHLY_PRICE)} al mes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {PLAN_ORDER.map((id) => <PlanCard key={id} plan={PLANS[id]} />)}
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-5 items-start">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
            <p className="text-sm font-bold text-orange-800 mb-1">Oferta fundadores</p>
            <p className="text-sm text-orange-900">
              {FOUNDERS_DISCOUNT} de descuento para los primeros {FOUNDERS_SLOTS} negocios que contraten un plan de pago.*
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-bold text-slate-800 mb-2">Próximamente</p>
            <ul className="text-sm text-slate-600 space-y-1">
              {UPCOMING_FEATURES.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </div>
        </div>

        <ul data-testid="pricing-fine-print" className="mt-8 space-y-1 text-xs text-slate-500 max-w-4xl">
          <li>Precios mensuales en pesos mexicanos{PRICES_INCLUDE_VAT ? ', IVA incluido' : ' más IVA'}.</li>
          <li>Gratis y Solo son para 1 persona. Taller incluye {PLANS.pro.includedUsers} usuarios y Empresa {PLANS.enterprise.includedUsers}; arriba de eso, cada usuario adicional cuesta {formatMxn(EXTRA_USER_MONTHLY_PRICE)} al mes.</li>
          <li>Lo marcado como «Próximamente» aún no está disponible, no forma parte de lo que se cobra hoy y su fecha puede cambiar.</li>
          <li>La contratación con tarjeta y el pago anual estarán disponibles próximamente; mientras tanto puedes usar el plan Gratis sin costo.</li>
          <li>* El descuento de fundadores se mantiene mientras la suscripción siga activa y se aplica cuando se habilite el cobro en línea.</li>
        </ul>
      </div>
    </section>
  )
}
