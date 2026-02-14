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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">CotizaPro</div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/signup">
              <Button>Prueba Gratis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Cotizaciones Profesionales<br />
          <span className="text-blue-600">en Minutos</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          La herramienta perfecta para técnicos de mantenimiento en México. Crea, envía y gestiona cotizaciones por WhatsApp y Email.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 hover:scale-105 transition-transform duration-300">
              Comenzar Gratis
            </Button>
          </Link>
          <Link href="#features" scroll={true}>
            <Button size="lg" variant="outline" className="text-lg px-8 hover:scale-105 transition-transform duration-300">
              Ver Características
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          ✓ Sin tarjeta de crédito ✓ 14 días gratis ✓ Cancelación cuando quieras
        </p>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">
          Todo lo que necesitas para cotizar
        </h2>
        <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
          Plataforma completa para técnicos de mantenimiento en México
        </p>

        {/* Categoría 1: Cotización Inteligente */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-8 flex items-center justify-center">
            <span className="text-3xl mr-3">🎯</span>
            Cotización Inteligente
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.cotizacion.map((feature, idx) => (
              <div key={idx} className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className={`w-12 h-12 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(feature.icon)} />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  {feature.title}
                  {feature.badge && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                </h4>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Categoría 2: Seguimiento & Automatización */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-8 flex items-center justify-center">
            <span className="text-3xl mr-3">📅</span>
            Seguimiento & Automatización
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.seguimiento.map((feature, idx) => (
              <div key={idx} className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className={`w-12 h-12 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(feature.icon)} />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  {feature.title}
                  {feature.badge && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                </h4>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Categoría 3: Gestión & Pagos */}
        <div>
          <h3 className="text-2xl font-bold mb-8 flex items-center justify-center">
            <span className="text-3xl mr-3">💰</span>
            Gestión & Pagos
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.gestion.map((feature, idx) => (
              <div key={idx} className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className={`w-12 h-12 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(feature.icon)} />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  {feature.title}
                  {feature.badge && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                </h4>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Confían en CotizaPro
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full mr-4 flex items-center justify-center text-white font-bold">
                  JP
                </div>
                <div>
                  <div className="font-semibold">Juan Pérez</div>
                  <div className="text-sm text-gray-600">Técnico HVAC - Ciudad de México</div>
                </div>
              </div>
              <p className="text-gray-700">
                &quot;Antes tardaba 30 minutos en hacer una cotización a mano. Ahora las hago en 2 minutos y las envío directo por WhatsApp. Mis clientes están impresionados.&quot;
              </p>
              <div className="text-yellow-500 mt-4">★★★★★</div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-full mr-4 flex items-center justify-center text-white font-bold">
                  MG
                </div>
                <div>
                  <div className="font-semibold">María González</div>
                  <div className="text-sm text-gray-600">Pintora Profesional - Guadalajara</div>
                </div>
              </div>
              <p className="text-gray-700">
                &quot;Mis clientes aman recibir cotizaciones profesionales por WhatsApp. He cerrado 40% más ventas desde que uso CotizaPro. La inversión se paga sola.&quot;
              </p>
              <div className="text-yellow-500 mt-4">★★★★★</div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full mr-4 flex items-center justify-center text-white font-bold">
                  CR
                </div>
                <div>
                  <div className="font-semibold">Carlos Ramírez</div>
                  <div className="text-sm text-gray-600">Plomero - Monterrey</div>
                </div>
              </div>
              <p className="text-gray-700">
                &quot;La gestión de clientes es increíble. Tengo todo el historial organizado y puedo hacer seguimiento fácilmente. Ya no pierdo clientes por desorganización.&quot;
              </p>
              <div className="text-yellow-500 mt-4">★★★★★</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">
          Planes que se ajustan a tu negocio
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Precios en pesos mexicanos (MXN). Todos los planes incluyen 14 días de prueba gratis.
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Plan Gratis */}
          <div className="border rounded-lg p-8 bg-white">
            <h3 className="text-2xl font-bold mb-2">Gratis</h3>
            <div className="text-4xl font-bold mb-4">
              $0<span className="text-lg text-gray-600 font-normal">/mes</span>
            </div>
            <p className="text-sm text-gray-600 mb-6">Perfecto para comenzar</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>10 cotizaciones/mes</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>5 clientes</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Envío por email</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>PDF profesional</span>
              </li>
            </ul>
            <Link href="/signup" className="block">
              <Button variant="outline" className="w-full">Comenzar Gratis</Button>
            </Link>
          </div>

          {/* Plan Pro */}
          <div className="border-2 border-blue-600 rounded-lg p-8 relative bg-white">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Más Popular
            </div>
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <div className="text-4xl font-bold mb-4">
              $299<span className="text-lg text-gray-600 font-normal">/mes</span>
            </div>
            <p className="text-sm text-gray-600 mb-6">Para técnicos profesionales</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Cotizaciones ilimitadas</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Clientes ilimitados</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>WhatsApp + Email</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Recordatorios automáticos</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Calendario de servicios</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Dashboard completo</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Soporte prioritario</span>
              </li>
            </ul>
            <Link href="/signup" className="block">
              <Button className="w-full">Comenzar Ahora</Button>
            </Link>
          </div>

          {/* Plan Empresa */}
          <div className="border rounded-lg p-8 bg-white">
            <h3 className="text-2xl font-bold mb-2">Empresa</h3>
            <div className="text-4xl font-bold mb-4">
              $799<span className="text-lg text-gray-600 font-normal">/mes</span>
            </div>
            <p className="text-sm text-gray-600 mb-6">Para equipos y empresas</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Todo en Pro +</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Múltiples usuarios</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Link de pago (Stripe)</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Facturación CFDI 4.0</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>API de acceso</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Logo personalizado</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Soporte dedicado 24/7</span>
              </li>
            </ul>
            <Link href="/signup" className="block">
              <Button variant="outline" className="w-full">Contactar Ventas</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-20 bg-gray-50">
        <h2 className="text-4xl font-bold text-center mb-4">
          Preguntas Frecuentes
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Todo lo que necesitas saber sobre CotizaPro
        </p>
        <div className="max-w-3xl mx-auto space-y-4">
          {/* FAQ 1 */}
          <details className="bg-white rounded-lg p-6 shadow-sm group">
            <summary className="font-semibold text-lg cursor-pointer flex items-center justify-between">
              ¿Cómo funciona la prueba gratis de 14 días?
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="text-gray-600 mt-4">
              No necesitas tarjeta de crédito para comenzar. Al registrarte, obtienes acceso completo a todas las funciones del plan Pro por 14 días. Si decides no continuar, tu cuenta simplemente pasa al plan gratuito automáticamente.
            </p>
          </details>

          {/* FAQ 2 */}
          <details className="bg-white rounded-lg p-6 shadow-sm group">
            <summary className="font-semibold text-lg cursor-pointer flex items-center justify-between">
              ¿Puedo enviar cotizaciones por WhatsApp?
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="text-gray-600 mt-4">
              Sí. Los planes Pro y Empresa incluyen envío directo por WhatsApp. Genera tu cotización en PDF y envíala al WhatsApp del cliente con un solo clic. También puedes enviar por Email en todos los planes.
            </p>
          </details>

          {/* FAQ 3 */}
          <details className="bg-white rounded-lg p-6 shadow-sm group">
            <summary className="font-semibold text-lg cursor-pointer flex items-center justify-between">
              ¿Incluye facturación electrónica (CFDI 4.0)?
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="text-gray-600 mt-4">
              La facturación CFDI 4.0 estará disponible próximamente en el plan Empresa. Te notificaremos cuando esté lista. Actualmente puedes generar cotizaciones profesionales en PDF con todos tus datos fiscales.
            </p>
          </details>

          {/* FAQ 4 */}
          <details className="bg-white rounded-lg p-6 shadow-sm group">
            <summary className="font-semibold text-lg cursor-pointer flex items-center justify-between">
              ¿Puedo personalizar mis cotizaciones?
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="text-gray-600 mt-4">
              Completamente. Puedes agregar tu logo, personalizar términos y condiciones, ajustar precios, agregar descuentos, configurar IVA y definir tus propias plantillas. Todo se guarda para reutilizar en futuras cotizaciones.
            </p>
          </details>

          {/* FAQ 5 */}
          <details className="bg-white rounded-lg p-6 shadow-sm group">
            <summary className="font-semibold text-lg cursor-pointer flex items-center justify-between">
              ¿Qué pasa si quiero cancelar?
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="text-gray-600 mt-4">
              Puedes cancelar tu suscripción en cualquier momento desde tu panel de control. No hay contratos ni penalidades. Si cancelas, tu cuenta pasa automáticamente al plan gratuito y mantienes acceso a tus cotizaciones anteriores.
            </p>
          </details>

          {/* FAQ 6 */}
          <details className="bg-white rounded-lg p-6 shadow-sm group">
            <summary className="font-semibold text-lg cursor-pointer flex items-center justify-between">
              ¿Funciona en mi celular?
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="text-gray-600 mt-4">
              Sí. CotizaPro funciona perfecto en celulares, tabletas y computadoras. Puedes crear y enviar cotizaciones desde cualquier dispositivo con internet. No necesitas instalar ninguna aplicación.
            </p>
          </details>

          {/* FAQ 7 */}
          <details className="bg-white rounded-lg p-6 shadow-sm group">
            <summary className="font-semibold text-lg cursor-pointer flex items-center justify-between">
              ¿Cómo funcionan los recordatorios automáticos?
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="text-gray-600 mt-4">
              Esta función estará disponible próximamente en el plan Pro. Te permitirá programar mensajes automáticos por WhatsApp para mantenimientos anuales, seguimiento de cotizaciones y recordatorios de servicio. Nunca más perderás un cliente por olvido.
            </p>
          </details>

          {/* FAQ 8 */}
          <details className="bg-white rounded-lg p-6 shadow-sm group">
            <summary className="font-semibold text-lg cursor-pointer flex items-center justify-between">
              ¿Ofrecen soporte técnico?
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="text-gray-600 mt-4">
              Sí. Todos los planes incluyen soporte por email en español. El plan Empresa incluye soporte prioritario 24/7 con respuesta en menos de 4 horas. También tenemos un centro de ayuda completo con tutoriales y guías.
            </p>
          </details>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Comienza a cotizar profesionalmente hoy
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Únete a cientos de técnicos que ya están cerrando más ventas con cotizaciones profesionales. Prueba gratis por 14 días.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Prueba Gratis por 14 Días
            </Button>
          </Link>
          <p className="text-sm mt-4 opacity-90">
            Sin tarjeta de crédito • Cancelación cuando quieras • Soporte en español
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-xl font-bold text-blue-600 mb-4">CotizaPro</div>
              <p className="text-gray-600 text-sm">
                La herramienta de cotizaciones profesionales para técnicos de mantenimiento en México.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="#features" className="hover:text-blue-600">Características</Link></li>
                <li><Link href="#pricing" className="hover:text-blue-600">Precios</Link></li>
                <li><Link href="/signup" className="hover:text-blue-600">Prueba Gratis</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/ayuda" className="hover:text-blue-600">Centro de Ayuda</Link></li>
                <li><Link href="/contacto" className="hover:text-blue-600">Contacto</Link></li>
                <li><Link href="/terminos" className="hover:text-blue-600">Términos</Link></li>
                <li><Link href="/privacidad" className="hover:text-blue-600">Privacidad</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/terminos" className="hover:text-blue-600">Términos de Servicio</Link></li>
                <li><Link href="/privacidad" className="hover:text-blue-600">Política de Privacidad</Link></li>
                <li><Link href="/cookies" className="hover:text-blue-600">Política de Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-gray-600 text-sm">
            <p>&copy; 2026 CotizaPro. Todos los derechos reservados. Hecho con ❤️ en México para técnicos mexicanos.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
