import { BadgeCheck, Mail, Palette, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Highlight {
  readonly icon: LucideIcon
  readonly title: string
  readonly description: string
}

const HIGHLIGHTS: readonly Highlight[] = [
  {
    icon: Palette,
    title: 'Tu marca en todo',
    description: 'Sube tu logo y elige tu color: aparecen en el PDF, el correo, tu página y tu panel.',
  },
  {
    icon: Mail,
    title: 'Envía por WhatsApp o correo',
    description: 'WhatsApp con el mensaje listo, o correo a nombre de tu negocio con el PDF adjunto.',
  },
  {
    icon: BadgeCheck,
    title: 'Tu página con reseñas verificadas',
    description: 'Solo califican clientes con un trabajo cobrado. Recibe solicitudes de cotización y compártela con QR.',
  },
  {
    icon: UsersRound,
    title: 'Equipo con roles',
    description: 'Invita por WhatsApp a ventas e instalación y asigna a cada quien su rol y permisos.',
  },
]

export function Highlights() {
  return (
    <section aria-labelledby="lo-mas-util" className="py-16 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="lo-mas-util" className="text-sm font-bold uppercase tracking-wider text-orange-600 text-center mb-8">
          Lo más útil para tu negocio
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="w-11 h-11 rounded-xl bg-blue-700 text-white flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
