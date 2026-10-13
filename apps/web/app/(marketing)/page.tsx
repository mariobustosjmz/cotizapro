import Link from 'next/link'
import { EXTRA_USER_MONTHLY_PRICE, PLANS, PLAN_ORDER, PRICES_INCLUDE_VAT } from '@/lib/plans/catalog'
import { formatMxn } from '@/lib/plans/pricing'
import { PricingSection } from '@/components/landing/pricing-section'
import { CaseStudyStats, UsageScenarios } from '@/components/landing/proof-sections'

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CotizaPro",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Cotizaciones profesionales para técnicos y talleres en México: cotiza por medidas, genera el PDF con tu logo y compártelo por WhatsApp.",
    "offers": PLAN_ORDER.map((id) => ({
      "@type": "Offer",
      "name": `Plan ${PLANS[id].name}`,
      "price": String(PLANS[id].monthlyPrice),
      "priceCurrency": "MXN",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": String(PLANS[id].monthlyPrice),
        "priceCurrency": "MXN",
        "unitText": "MES",
        "valueAddedTaxIncluded": PRICES_INCLUDE_VAT,
      },
    })),
  }
  const features = {
    cotizacion: [
      {
        icon: "document",
        title: "Cotiza en Minutos",
        description: "Catálogo con precios y plantillas por giro. Captura medidas y opciones; el total se calcula solo.",
        color: "blue",
        badge: null
      },
      {
        icon: "pdf",
        title: "PDF Profesional",
        description: "PDF con tu logo personalizado, términos y condiciones. Impresiona a tus clientes desde la primera impresión.",
        color: "red",
        badge: null
      },
      {
        icon: "calculator",
        title: "Cálculo Automático",
        description: "IVA, descuentos y totales calculados automáticamente. Precios en pesos mexicanos (MXN). Sin errores.",
        color: "orange",
        badge: null
      },
      {
        icon: "template",
        title: "Plantillas Personalizables",
        description: "Guarda plantillas con servicios, condiciones y etiquetas promocionales. Crea cotizaciones en segundos con un solo clic.",
        color: "purple",
        badge: null
      }
    ],
    seguimiento: [
      {
        icon: "whatsapp",
        title: "Envío por WhatsApp",
        description: "Con un toque se abre tu WhatsApp con el mensaje listo: folio, total y vigencia. El envío por correo llega próximamente.",
        color: "green",
        badge: null
      },
      {
        icon: "bell",
        title: "Recordatorios",
        description: "Agenda seguimientos, cobros y mantenimientos y míralos en tu panel. El aviso automático al cliente llega próximamente.",
        color: "yellow",
        badge: null
      },
      {
        icon: "calendar",
        title: "Calendario de Servicios",
        description: "Agenda mediciones e instalaciones con responsable, en una vista semanal para todo tu equipo.",
        color: "indigo",
        badge: null
      },
      {
        icon: "kanban",
        title: "Tablero Kanban",
        description: "Mueve tus cotizaciones entre estados: enviada, aprobada, en instalación, completada y cobrada. Visión clara de tu pipeline.",
        color: "teal",
        badge: null
      }
    ],
    gestion: [
      {
        icon: "users",
        title: "CRM Integrado",
        description: "Gestión de clientes con tags, notas y seguimiento. Organiza tu negocio como un profesional.",
        color: "purple",
        badge: null
      },
      {
        icon: "creditcard",
        title: "Registro de Cobros",
        description: "Registra anticipos y liquidaciones por cotización. Visualiza cuánto has cobrado y cuánto falta con barra de progreso.",
        color: "blue",
        badge: null
      },
      {
        icon: "receipt",
        title: "Facturación CFDI 4.0",
        description: "Emitir la factura electrónica desde la cotización cobrada, a través de un PAC autorizado.",
        color: "green",
        badge: "Próximamente"
      },
      {
        icon: "chart",
        title: "Analytics de Ingresos",
        description: "Ingresos por periodo, tasa de conversión y tendencias de cobro. Toma decisiones basadas en datos reales de tu negocio.",
        color: "red",
        badge: null
      }
    ]
  }

  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    indigo: "bg-indigo-100 text-indigo-600",
    teal: "bg-teal-100 text-teal-600"
  }

  const getIconPath = (iconName: string) => {
    const icons: Record<string, string> = {
      document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      pdf: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
      calculator: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
      template: "M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z",
      whatsapp: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
      bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
      calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      creditcard: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
      receipt: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
      chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      kanban: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
    }
    return icons[iconName] || icons.document
  }

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900">
                Cotiza<span className="text-blue-800">Pro</span>
              </span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#caracteristicas" className="text-sm font-medium text-slate-600 hover:text-blue-800 transition-colors cursor-pointer">
                Características
              </Link>
              <Link href="#precios" className="text-sm font-medium text-slate-600 hover:text-blue-800 transition-colors cursor-pointer">
                Precios
              </Link>
              <Link href="#faq" className="text-sm font-medium text-slate-600 hover:text-blue-800 transition-colors cursor-pointer">
                FAQ
              </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
                Iniciar sesión
              </Link>
              <Link href="/signup">
                <button className="btn-glow-orange bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">
                  Empieza Gratis
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-16 pb-24">
        {/* Gradient mesh blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-blob absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-300/30 blur-3xl opacity-40" />
          <div className="animate-blob-delay-2 absolute top-1/2 -right-48 w-[420px] h-[420px] rounded-full bg-blue-400/25 blur-3xl opacity-40" />
          <div className="animate-blob-delay-4 absolute -bottom-24 left-1/3 w-[380px] h-[380px] rounded-full bg-orange-300/20 blur-3xl opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left column */}
            <div className="animate-fade-in-up">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Nuevo: Pagos, Kanban y Analytics incluidos
              </div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">
                Cotiza como{' '}
                <span className="gradient-text-animated">profesional</span>
                <br />en minutos
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg animate-fade-in-up-delay-1">
                Cotizaciones, cobros y agenda para técnicos y talleres en México: vidrio, aire acondicionado, plomería, electricidad y más. Desde el celular.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-10 animate-fade-in-up-delay-2">
                <Link href="/signup">
                  <button className="btn-glow-orange bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors cursor-pointer w-full sm:w-auto">
                    Empieza Gratis — sin tarjeta
                  </button>
                </Link>
                <Link href="#precios">
                  <button className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-8 py-4 rounded-xl text-base transition-colors cursor-pointer w-full sm:w-auto">
                    Ver precios
                  </button>
                </Link>
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-4 animate-fade-in-up-delay-3">
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span>Funciona en celular y tableta</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <span>Precios en pesos, IVA incluido</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Conexión cifrada y respaldos diarios</span>
                </div>
              </div>
            </div>

            {/* Right column — floating mockup cards */}
            <div className="relative hidden lg:flex items-center justify-center h-[460px]">
              {/* Quote card */}
              <div className="animate-float absolute top-0 left-8 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ejemplo · COT-2026-002</span>
                  <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Enviada</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">Cancel de baño templado 9 mm</p>
                <p className="text-xs text-slate-500 mb-3">Cliente: Andrea G.</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-black text-slate-900">$12,238 <span className="text-sm font-normal text-slate-500">MXN</span></span>
                  <span className="text-xs text-slate-400">IVA incluido</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '50%' }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">Anticipo cobrado: 50 %</p>
              </div>

              {/* Stats card */}
              <div className="animate-float-slow absolute bottom-8 left-0 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-10">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Proyección · caso de estudio</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-black text-blue-800">10</p>
                    <p className="text-xs text-slate-500">Cotizaciones</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-orange-500">6</p>
                    <p className="text-xs text-slate-500">Ganadas</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-800">$174,309 MXN</p>
                  <p className="text-xs text-slate-400">En trabajos ganados (6 semanas, datos ficticios)</p>
                </div>
              </div>

              {/* Notification card */}
              <div className="animate-float-delay absolute top-16 right-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-30">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Cliente aprobó cotización</p>
                    <p className="text-xs text-slate-500 mt-0.5">Andrea G. — COT-2026-002</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">Ejemplo ilustrativo</p>
                  </div>
                </div>
              </div>

              {/* Decorative ring */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-100/40 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Proyección del caso de estudio ─────────────────────────── */}
      <CaseStudyStats />

      {/* ── Features Section ────────────────────────────────────────── */}
      <section id="caracteristicas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Todo lo que necesitas para crecer
            </h2>
            <div className="w-16 h-1 bg-orange-500 rounded-full mx-auto mb-4" />
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Herramientas diseñadas para técnicos que quieren profesionalizarse y ganar más clientes.
            </p>
          </div>

          {/* Category 1: Cotización */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                {/* Lightning bolt SVG icon */}
                <svg className="w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wide">
                Cotización Profesional
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.cotizacion.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`feature-card-${(index + 1) as 1 | 2 | 3 | 4} bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:border-blue-100 transition-all cursor-default`}
                >
                  <div className={`w-11 h-11 rounded-xl ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={getIconPath(feature.icon)} />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 text-sm leading-snug">{feature.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                  {feature.badge && (
                    <span className="inline-block mt-3 text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Category 2: Seguimiento */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                {/* Refresh/cycle arrows SVG icon */}
                <svg className="w-5 h-5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase tracking-wide">
                Seguimiento y Envío
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.seguimiento.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`feature-card-${(index + 1) as 1 | 2 | 3 | 4} bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:border-green-100 transition-all cursor-default`}
                >
                  <div className={`w-11 h-11 rounded-xl ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={getIconPath(feature.icon)} />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 text-sm leading-snug">{feature.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                  {feature.badge && (
                    <span className="inline-block mt-3 text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Category 3: Gestión */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                {/* Dollar circle SVG icon */}
                <svg className="w-5 h-5 text-purple-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v12M9 9.5c0-1.5 1.34-2.5 3-2.5s3 1 3 2.5-1.34 2.5-3 2.5-3 1-3 2.5 1.34 2.5 3 2.5 3-1 3-2.5" />
                </svg>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wide">
                Gestión de Negocio
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.gestion.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`feature-card-${(index + 1) as 1 | 2 | 3 | 4} bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:border-purple-100 transition-all cursor-default`}
                >
                  <div className={`w-11 h-11 rounded-xl ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={getIconPath(feature.icon)} />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 text-sm leading-snug">{feature.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                  {feature.badge && (
                    <span className="inline-block mt-3 text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Escenarios de uso ───────────────────────────────────────── */}
      <UsageScenarios />

      {/* ── Pricing Section ─────────────────────────────────────────── */}
      <PricingSection />

      {/* ── FAQ Section ─────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "¿Necesito saber de tecnología para usar CotizaPro?",
                a: "No. CotizaPro está diseñado para técnicos, no para ingenieros de software. Si sabes usar WhatsApp, puedes usar CotizaPro. La interfaz es simple e intuitiva."
              },
              {
                q: "¿Puedo usar CotizaPro desde mi celular?",
                a: "Sí. Funciona en celular, tableta y computadora desde el navegador, sin instalar nada. Puedes cotizar en la obra y compartir la cotización por WhatsApp al momento."
              },
              {
                q: "¿Hay periodo de prueba?",
                a: "El plan Gratis no vence: úsalo con 5 cotizaciones al mes el tiempo que quieras y cambia de plan cuando lo necesites. No pedimos tarjeta."
              },
              {
                q: "¿Cuánto cuesta agregar a más personas de mi equipo?",
                a: `Gratis y Solo son para una persona. Taller incluye ${PLANS.pro.includedUsers} usuarios y Empresa ${PLANS.enterprise.includedUsers}; arriba de eso, cada usuario adicional cuesta ${formatMxn(EXTRA_USER_MONTHLY_PRICE)} al mes.`
              },
              {
                q: "¿Cómo se envían las cotizaciones por WhatsApp?",
                a: "Con un toque se abre tu WhatsApp con el mensaje escrito (folio, total y vigencia) y adjuntas el PDF. El envío automático por la API oficial de WhatsApp llegará próximamente."
              },
              {
                q: "¿Mis datos y los de mis clientes están seguros?",
                a: "La conexión va cifrada (HTTPS), cada negocio solo puede ver su propia información y hacemos respaldos diarios. Consulta nuestro aviso de privacidad para saber cómo tratamos tus datos."
              },
              {
                q: "¿Puedo cancelar en cualquier momento?",
                a: "Sí. No hay contratos forzosos ni penalizaciones. La contratación y cancelación desde tu cuenta estarán disponibles cuando se active el cobro en línea."
              },
              {
                q: "¿Qué pasa con mis cotizaciones si cancelo?",
                a: "Puedes descargar el PDF de cada cotización cuando quieras. Tus datos son tuyos."
              },
              {
                q: "¿Funciona para mi giro?",
                a: "Incluye plantillas para vidrio y aluminio, aire acondicionado, plomería, electricidad y costura, y un catálogo general que puedes adaptar a cualquier oficio."
              },
              {
                q: "¿Puedo agregar mi propio catálogo de servicios?",
                a: "Sí. Puedes personalizar completamente tu catálogo de servicios, precios, unidades y descripciones. También incluimos plantillas por giro para que empieces rápido."
              }
            ].map((item) => (
              <details key={item.q} className="bg-white border border-slate-200 rounded-xl group">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-sm font-semibold text-slate-800 hover:text-blue-800 transition-colors list-none">
                  {item.q}
                  <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA Section ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 to-blue-900 py-24">
        {/* Blob decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-blob absolute -top-24 -left-24 w-[400px] h-[400px] rounded-full bg-blue-500/30 blur-3xl" />
          <div className="animate-blob-delay-2 absolute -bottom-24 -right-24 w-[350px] h-[350px] rounded-full bg-blue-400/25 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Empieza hoy a cotizar como profesional
          </h2>
          <p className="text-lg text-blue-200 mb-10">
            Plan Gratis sin vencimiento. Sin tarjeta de crédito.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <button className="btn-glow-orange bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-xl text-base transition-colors cursor-pointer">
                Empieza Gratis Ahora
              </button>
            </Link>
            <Link href="/login">
              <button className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-10 py-4 rounded-xl text-base transition-colors cursor-pointer">
                Ver demo
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Logo & tagline */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-white font-bold">Cotiza<span className="text-blue-400">Pro</span></span>
              </div>
              <p className="text-sm leading-relaxed">
                Cotizaciones profesionales para técnicos de mantenimiento en México.
              </p>
            </div>

            {/* Producto */}
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Producto</p>
              <ul className="space-y-2.5">
                <li><Link href="#caracteristicas" className="text-sm hover:text-white transition-colors cursor-pointer">Características</Link></li>
                <li><Link href="#precios" className="text-sm hover:text-white transition-colors cursor-pointer">Precios</Link></li>
                <li><Link href="#faq" className="text-sm hover:text-white transition-colors cursor-pointer">FAQ</Link></li>
                <li><Link href="#caracteristicas" className="text-sm hover:text-white transition-colors cursor-pointer">Novedades</Link></li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Empresa</p>
              <ul className="space-y-2.5">
                <li><Link href="/signup" className="text-sm hover:text-white transition-colors cursor-pointer">Empezar gratis</Link></li>
                <li><Link href="#precios" className="text-sm hover:text-white transition-colors cursor-pointer">Precios</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Legal</p>
              <ul className="space-y-2.5">
                <li><Link href="/privacidad" className="text-sm hover:text-white transition-colors cursor-pointer">Privacidad</Link></li>
                <li><Link href="/terminos" className="text-sm hover:text-white transition-colors cursor-pointer">Términos de Uso</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} CotizaPro. Hecho con pasión en México.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">Conexión cifrada</span>
                            <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">Aviso de privacidad</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
