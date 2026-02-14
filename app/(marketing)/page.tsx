import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
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
            <Button size="lg" className="text-lg px-8">
              Comenzar Gratis
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="text-lg px-8">
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
        <h2 className="text-4xl font-bold text-center mb-12">
          Todo lo que necesitas para cotizar
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Cotizaciones Rápidas</h3>
            <p className="text-gray-600">
              Crea cotizaciones profesionales en PDF en menos de 2 minutos con tu catálogo de servicios. Ahorra 28 minutos por cotización.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Envío por WhatsApp</h3>
            <p className="text-gray-600">
              Envía cotizaciones directo al WhatsApp de tus clientes con un solo clic. Rápido, conveniente y profesional.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Gestión de Clientes</h3>
            <p className="text-gray-600">
              Mantén organizados todos tus clientes con historial de cotizaciones, notas y seguimiento de ventas.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Cálculo Automático</h3>
            <p className="text-gray-600">
              IVA, descuentos y totales calculados automáticamente. Sin errores matemáticos. Precios en pesos mexicanos (MXN).
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Dashboard de Ventas</h3>
            <p className="text-gray-600">
              Visualiza tus cotizaciones enviadas, aceptadas y métricas de conversión en tiempo real. Toma mejores decisiones.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">100% Móvil</h3>
            <p className="text-gray-600">
              Crea y envía cotizaciones desde tu celular, tablet o computadora. Funciona en cualquier dispositivo.
            </p>
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
