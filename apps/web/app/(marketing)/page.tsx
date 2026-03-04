import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CotizaPro",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "La herramienta perfecta para técnicos de mantenimiento en México. Crea cotizaciones profesionales en PDF, envíalas por WhatsApp y Email en minutos.",
    "offers": [
      {
        "@type": "Offer",
        "name": "Plan Gratis",
        "price": "0",
        "priceCurrency": "MXN"
      },
      {
        "@type": "Offer",
        "name": "Plan Pro",
        "price": "299",
        "priceCurrency": "MXN"
      },
      {
        "@type": "Offer",
        "name": "Plan Empresa",
        "price": "799",
        "priceCurrency": "MXN"
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    }
  }
  const features = {
    cotizacion: [
      {
        icon: "document",
        title: "Cotizaciones en 30 Segundos",
        description: "Catálogo pre-cargado de servicios con precios. Crea cotizaciones profesionales en menos de 30 segundos.",
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
        description: "Configura términos de pago, garantías y condiciones una vez. Reutiliza en todas tus cotizaciones.",
        color: "purple",
        badge: null
      }
    ],
    seguimiento: [
      {
        icon: "whatsapp",
        title: "Envío por WhatsApp/Email",
        description: "Envía cotizaciones directo al WhatsApp o Email de tus clientes. Rápido, conveniente y profesional.",
        color: "green",
        badge: null
      },
      {
        icon: "bell",
        title: "Recordatorios Automáticos",
        description: "WhatsApp automático para mantenimientos anuales. Nunca vuelvas a perder un cliente por olvido.",
        color: "yellow",
        badge: "PRÓXIMAMENTE"
      },
      {
        icon: "calendar",
        title: "Calendario de Servicios",
        description: "Agenda citas, visualiza tu semana y organiza tus servicios. Sincroniza con Google Calendar.",
        color: "indigo",
        badge: "PRÓXIMAMENTE"
      },
      {
        icon: "history",
        title: "Historial Completo",
        description: "Todas las cotizaciones, servicios y pagos por cliente. Acceso instantáneo al historial completo.",
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
        title: "Link de Pago",
        description: "Cobra con Stripe (tarjeta o transferencia). Envía link de pago y recibe confirmación automática.",
        color: "blue",
        badge: "PRÓXIMAMENTE"
      },
      {
        icon: "receipt",
        title: "Facturación CFDI 4.0",
        description: "Facturas electrónicas automáticas cumpliendo con SAT. Integración con PAC certificado.",
        color: "green",
        badge: "PRÓXIMAMENTE"
      },
      {
        icon: "chart",
        title: "Dashboard de Ventas",
        description: "Métricas en tiempo real: conversión, ingresos, tendencias. Toma decisiones basadas en datos.",
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
      chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
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
                Nuevo: WhatsApp integrado
              </div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">
                Cotiza como{' '}
                <span className="gradient-text-animated">profesional</span>
                <br />en 30 segundos
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg animate-fade-in-up-delay-1">
                La plataforma de cotizaciones para técnicos de HVAC, plomería, electricidad y pintura en México. Profesional, rápido y sin complicaciones.
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
                  <span><strong className="text-slate-700">4.8</strong> calificación promedio</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <span><strong className="text-slate-700">500+</strong> técnicos activos</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>SSL certificado</span>
                </div>
              </div>
            </div>

            {/* Right column — floating mockup cards */}
            <div className="relative hidden lg:flex items-center justify-center h-[460px]">
              {/* Quote card */}
              <div className="animate-float absolute top-0 left-8 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cotización #1247</span>
                  <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Enviada</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">Instalación A/C Split 24,000 BTU</p>
                <p className="text-xs text-slate-500 mb-3">Cliente: Constructora Reyma</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-black text-slate-900">$4,500 <span className="text-sm font-normal text-slate-500">MXN</span></span>
                  <span className="text-xs text-slate-400">+IVA</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '68%' }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">Tasa de cierre: 68%</p>
              </div>

              {/* Stats card */}
              <div className="animate-float-slow absolute bottom-8 left-0 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-10">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Este mes</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-black text-blue-800">127</p>
                    <p className="text-xs text-slate-500">Cotizaciones</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-orange-500">68%</p>
                    <p className="text-xs text-slate-500">Cierre</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-800">$142,800 MXN</p>
                  <p className="text-xs text-slate-400">Ingresos del mes</p>
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
                    <p className="text-xs text-slate-500 mt-0.5">Constructora Reyma — #1247</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">hace 2 minutos</p>
                  </div>
                </div>
              </div>

              {/* Decorative ring */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-100/40 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-white">500+</p>
              <p className="text-sm text-slate-400 mt-1">Técnicos Activos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-orange-400">30 seg</p>
              <p className="text-sm text-slate-400 mt-1">Por Cotización</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-white">4.8
                <span className="text-yellow-400 text-2xl ml-1">★</span>
              </p>
              <p className="text-sm text-slate-400 mt-1">Calificación Promedio</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-green-400">+40%</p>
              <p className="text-sm text-slate-400 mt-1">Más Ventas Promedio</p>
            </div>
          </div>
        </div>
      </section>

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

      {/* ── Testimonials ────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Lo que dicen nuestros técnicos
            </h2>
            <p className="text-lg text-slate-600">
              Más de 500 técnicos ya transformaron su negocio con CotizaPro.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                "Antes tardaba 2 horas haciendo una cotización en Word. Ahora en 5 minutos tengo el PDF y se lo mando por WhatsApp al cliente. Mis ventas subieron 40%."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  RM
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Roberto Martínez</p>
                  <p className="text-xs text-slate-500">Técnico HVAC — Guadalajara</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                "El historial de clientes es increíble. Ya no pierdo clientes por no recordar cuándo fue su último mantenimiento. CotizaPro se paga solo en el primer mes."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  AG
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Ana González</p>
                  <p className="text-xs text-slate-500">Plomera — Ciudad de México</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                "El PDF profesional con mi logo marca la diferencia. Mis clientes me ven como una empresa seria. Ya conseguí contratos con empresas que antes ni me consideraban."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  CR
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Carlos Ramírez</p>
                  <p className="text-xs text-slate-500">Electricista — Monterrey</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ─────────────────────────────────────────── */}
      <section id="precios" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Planes para cada técnico
            </h2>
            <p className="text-lg text-slate-600">
              Empieza gratis y escala cuando tu negocio crezca.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {/* Plan Gratis */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Gratis</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-slate-900">$0</span>
                <span className="text-slate-500 text-sm">/mes</span>
              </div>
              <p className="text-xs text-slate-500 mb-6">Para empezar sin riesgo</p>
              <Link href="/signup">
                <button className="w-full border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold py-3 rounded-xl text-sm transition-colors cursor-pointer mb-6">
                  Empieza Gratis
                </button>
              </Link>
              <ul className="space-y-3">
                {[
                  "5 cotizaciones por mes",
                  "1 plantilla de PDF",
                  "Envío por Email",
                  "Historial 30 días",
                  "Soporte básico"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Plan Pro */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-7 relative overflow-hidden shadow-2xl">
              {/* Most popular badge */}
              <div className="absolute top-4 right-4">
                <span className="text-xs font-bold bg-orange-500 text-white px-3 py-1 rounded-full">Más Popular</span>
              </div>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">Pro</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-white">$299</span>
                <span className="text-blue-200 text-sm">/mes</span>
              </div>
              <p className="text-xs text-blue-200 mb-6">Para técnicos en crecimiento</p>
              <Link href="/signup">
                <button className="btn-glow-orange w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer mb-6">
                  Empieza 14 días gratis
                </button>
              </Link>
              <ul className="space-y-3">
                {[
                  "Cotizaciones ilimitadas",
                  "PDF con logo personalizado",
                  "Envío por WhatsApp y Email",
                  "Historial completo",
                  "CRM de clientes",
                  "Dashboard de ventas",
                  "Soporte prioritario"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white">
                    <svg className="w-4 h-4 text-blue-200 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Plan Empresa */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Empresa</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-slate-900">$799</span>
                <span className="text-slate-500 text-sm">/mes</span>
              </div>
              <p className="text-xs text-slate-500 mb-6">Para equipos y empresas</p>
              <Link href="/signup">
                <button className="w-full border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold py-3 rounded-xl text-sm transition-colors cursor-pointer mb-6">
                  Contactar ventas
                </button>
              </Link>
              <ul className="space-y-3">
                {[
                  "Todo lo del plan Pro",
                  "Hasta 10 técnicos",
                  "Múltiples logos/plantillas",
                  "Facturación CFDI 4.0",
                  "Link de pago integrado",
                  "API de integración",
                  "Soporte dedicado 24/7"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

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
                a: "Sí. CotizaPro funciona perfectamente en móvil, tablet y computadora. Puedes crear cotizaciones en obra desde tu smartphone y enviarlas al instante."
              },
              {
                q: "¿Cómo funciona el período de prueba?",
                a: "El plan Pro incluye 14 días gratis sin necesidad de tarjeta de crédito. Exploras todas las funciones premium y decides si se adapta a tu negocio."
              },
              {
                q: "¿Mis datos y los de mis clientes están seguros?",
                a: "Sí. Usamos cifrado SSL de nivel bancario y servidores certificados en México. Cumplimos con la Ley Federal de Protección de Datos Personales (LFPDPPP)."
              },
              {
                q: "¿Puedo cancelar en cualquier momento?",
                a: "Sí. Sin penalizaciones, sin contratos anuales obligatorios. Cancelas cuando quieras directamente desde tu cuenta en menos de 1 minuto."
              },
              {
                q: "¿Qué pasa con mis cotizaciones si cancelo?",
                a: "Puedes exportar todas tus cotizaciones en PDF antes de cancelar. Tus datos son tuyos y siempre tienes acceso a ellos."
              },
              {
                q: "¿Funciona para mi giro? No solo HVAC",
                a: "Sí. CotizaPro es ideal para HVAC, plomería, electricidad, pintura, albañilería, refrigeración, fumigación y cualquier servicio técnico de mantenimiento."
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
            Únete a más de 500 técnicos que ya crecen con CotizaPro
          </h2>
          <p className="text-lg text-blue-200 mb-10">
            Comienza gratis hoy. Sin tarjeta de crédito. Cancela cuando quieras.
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
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">SSL Seguro</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">Stripe</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">Privacidad LFPDPPP</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
