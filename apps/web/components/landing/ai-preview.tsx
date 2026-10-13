import { MessageSquareText, PenLine, Send, Sparkles, Store, Wand2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface AiFeature {
  readonly icon: LucideIcon
  readonly title: string
  readonly description: string
  readonly credits: number
}

const AI_FEATURES: readonly AiFeature[] = [
  { icon: MessageSquareText, title: 'Del WhatsApp a la cotización', description: 'Pega el mensaje del cliente y obtén un borrador con su nombre, teléfono, partidas y medidas. Los precios salen de tu catálogo.', credits: 3 },
  { icon: PenLine, title: 'Descripciones profesionales', description: 'Escribe “cancel baño templado 6 mm negro 1.20x1.90” y recibe una descripción clara para tu cliente.', credits: 2 },
  { icon: Send, title: 'Seguimiento de pendientes', description: 'Un mensaje amable para las cotizaciones enviadas que no han tenido respuesta, listo para WhatsApp o correo.', credits: 1 },
  { icon: Wand2, title: 'Reescribe y responde', description: 'Pule tus notas y términos, tradúcelos al inglés o responde una reseña en segundos.', credits: 1 },
  { icon: Store, title: 'Textos de tu página', description: 'Genera tu presentación y la descripción de tus servicios para tu página pública.', credits: 2 },
]

const MONTHLY_CREDITS: readonly { readonly plan: string; readonly credits: string }[] = [
  { plan: 'Gratis', credits: '25' },
  { plan: 'Solo', credits: '150' },
  { plan: 'Taller', credits: '400' },
  { plan: 'Empresa', credits: '1,200' },
]

function UsageMeterPreview() {
  return (
    <div className="rounded-2xl border border-white/15 bg-white p-6 text-slate-900 shadow-2xl" aria-label="Vista previa del medidor de uso de IA">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="text-lg font-bold">Uso de IA</h3>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
          <Sparkles className="w-4 h-4 text-orange-500" aria-hidden="true" />
          Obtener más
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm mb-2">
        <p><span className="font-semibold">Tu uso del mes</span> <span className="text-slate-500">· Se reinicia el día 1</span></p>
        <p className="text-slate-700">23 % usado</p>
      </div>
      <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden" role="img" aria-label="23 por ciento usado">
        <div className="h-full w-[23%] rounded-full bg-blue-700" />
      </div>
      <ul className="mt-5 space-y-2 text-sm text-slate-600">
        <li className="flex justify-between"><span>Del WhatsApp a la cotización</span><span className="font-medium text-slate-800">51 créditos</span></li>
        <li className="flex justify-between"><span>Descripciones</span><span className="font-medium text-slate-800">28 créditos</span></li>
        <li className="flex justify-between"><span>Seguimientos</span><span className="font-medium text-slate-800">13 créditos</span></li>
      </ul>
      <p className="mt-4 text-xs text-slate-400">Vista previa con datos de ejemplo.</p>
    </div>
  )
}

export function AiPreview() {
  return (
    <section id="ia" aria-labelledby="ia-titulo" className="py-24 bg-gradient-to-br from-slate-900 to-blue-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-300 mb-4">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Próximamente
          </span>
          <h2 id="ia-titulo" className="text-3xl sm:text-4xl font-black mb-4">IA que cotiza contigo</h2>
          <p className="text-lg text-blue-100/80 max-w-2xl mx-auto">
            Asistente en español para el día a día del taller. Todo lo que escribe es un borrador que tú revisas, y nunca inventa precios: siempre salen de tu catálogo.
          </p>
        </div>

        <div className="grid lg:grid-cols-[3fr_2fr] gap-10 items-start">
          <div className="grid sm:grid-cols-2 gap-4">
            {AI_FEATURES.map(({ icon: Icon, title, description, credits }, index) => (
              <div key={title} className={`rounded-2xl border border-white/10 bg-white/5 p-5 ${index === AI_FEATURES.length - 1 ? 'sm:col-span-2' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-300 flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-blue-200/80">{credits} {credits === 1 ? 'crédito' : 'créditos'}</span>
                </div>
                <h3 className="font-bold mb-1.5">{title}</h3>
                <p className="text-sm text-blue-100/75 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <UsageMeterPreview />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold mb-3">Créditos de IA incluidos al mes</p>
              <dl className="grid grid-cols-4 gap-2 text-center">
                {MONTHLY_CREDITS.map(({ plan, credits }) => (
                  <div key={plan} className="rounded-xl bg-white/5 py-3">
                    <dt className="text-xs text-blue-200/80">{plan}</dt>
                    <dd className="text-lg font-black">{credits}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-blue-200/70">¿Necesitas más? Paquetes de créditos extra. Si se acaban, solo se pausa la IA: cotizar y enviar siguen funcionando.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
