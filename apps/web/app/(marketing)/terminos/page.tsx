import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
}

export default function TerminosPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Términos y Condiciones
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
        Última actualización: marzo 2026
      </p>

      <div className="prose dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Aceptación de los términos</h2>
          <p>
            Al acceder y utilizar CotizaPro, usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Descripción del servicio</h2>
          <p>
            CotizaPro es una plataforma de gestión de cotizaciones dirigida a pequeñas y medianas empresas (PYMES). El servicio permite crear, enviar y gestionar cotizaciones profesionales, así como administrar clientes, servicios y seguimientos de pagos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Cuentas de usuario</h2>
          <p>
            Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. Acepta notificar inmediatamente a CotizaPro sobre cualquier uso no autorizado de su cuenta. CotizaPro no será responsable por pérdidas derivadas del incumplimiento de esta obligación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Uso aceptable</h2>
          <p>Usted acepta NO utilizar el servicio para:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Actividades ilegales o fraudulentas</li>
            <li>Enviar spam o comunicaciones no solicitadas</li>
            <li>Violar derechos de propiedad intelectual de terceros</li>
            <li>Intentar acceder sin autorización a sistemas o datos de otros usuarios</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Propiedad intelectual</h2>
          <p>
            El servicio y su contenido original, características y funcionalidad son y seguirán siendo propiedad exclusiva de CotizaPro y sus licenciantes. El servicio está protegido por derechos de autor, marcas registradas y otras leyes de propiedad intelectual.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Limitación de responsabilidad</h2>
          <p>
            En ningún caso CotizaPro, sus directores, empleados, socios o agentes serán responsables por daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo pérdida de beneficios, datos, uso u otras pérdidas intangibles, derivadas de su uso del servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Modificaciones</h2>
          <p>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entran en vigor inmediatamente después de su publicación. El uso continuado del servicio constituye aceptación de los nuevos términos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Contacto</h2>
          <p>
            Para cualquier pregunta sobre estos términos, contáctenos en:{' '}
            <a href="mailto:soporte@cotizapro.mx" className="text-blue-600 dark:text-blue-400 hover:underline">
              soporte@cotizapro.mx
            </a>
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  )
}
