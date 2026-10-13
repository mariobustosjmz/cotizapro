import { CASE_STUDY_NOTE, CASE_STUDY_STATS, SCENARIOS_NOTE, USAGE_SCENARIOS } from '@/lib/marketing/case-study'

export function CaseStudyStats() {
  return (
    <section className="bg-slate-900 py-12" aria-label="Proyección de un caso de estudio">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-orange-400 mb-6">Proyección · caso de estudio simulado</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {CASE_STUDY_STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl sm:text-4xl font-black text-white">{stat.value}</p>
              <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500 max-w-3xl mx-auto">{CASE_STUDY_NOTE}</p>
      </div>
    </section>
  )
}

export function UsageScenarios() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Cómo se ve en el día a día</h2>
          <p className="text-lg text-slate-600">Escenarios de uso para distintos tamaños de negocio.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {USAGE_SCENARIOS.map((scenario) => (
            <figure key={scenario.profile} className="bg-white rounded-2xl border border-slate-100 p-7 shadow-sm">
              <span className="inline-block mb-4 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Escenario ilustrativo</span>
              <blockquote className="text-slate-600 text-sm leading-relaxed mb-5">“{scenario.quote}”</blockquote>
              <figcaption className="text-sm font-bold text-slate-800">{scenario.profile}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">{SCENARIOS_NOTE}</p>
      </div>
    </section>
  )
}
