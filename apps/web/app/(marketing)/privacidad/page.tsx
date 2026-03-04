import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad',
}

export default function PrivacidadPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Política de Privacidad
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
        Última actualización: marzo 2026
      </p>

      <div className="prose dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Información que recopilamos</h2>
          <p>Recopilamos información que usted nos proporciona directamente, incluyendo:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Nombre y dirección de correo electrónico al crear una cuenta</li>
            <li>Información de su organización (nombre, RFC, dirección)</li>
            <li>Datos de clientes, servicios y cotizaciones que ingrese en la plataforma</li>
            <li>Información de uso y registros de actividad</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Cómo usamos su información</h2>
          <p>Utilizamos la información recopilada para:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Proveer, mantener y mejorar nuestros servicios</li>
            <li>Procesar transacciones y enviar notificaciones relacionadas</li>
            <li>Enviar información técnica, actualizaciones y mensajes de soporte</li>
            <li>Responder a sus comentarios y preguntas</li>
            <li>Cumplir con obligaciones legales aplicables</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Compartir información</h2>
          <p>
            No vendemos, comercializamos ni transferimos a terceros su información personal identificable, excepto en los siguientes casos:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Proveedores de servicios que nos asisten en la operación del sitio (bajo acuerdos de confidencialidad)</li>
            <li>Cuando la ley lo requiera o para proteger nuestros derechos</li>
            <li>Con su consentimiento explícito</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Seguridad de datos</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizacionales para proteger su información contra acceso no autorizado, alteración, divulgación o destrucción. Los datos se almacenan en servidores seguros con cifrado en tránsito (TLS) y en reposo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Cookies</h2>
          <p>
            Utilizamos cookies de sesión para autenticación y cookies técnicas esenciales para el funcionamiento del servicio. No utilizamos cookies de seguimiento de terceros para publicidad.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Sus derechos (ARCO)</h2>
          <p>
            De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), usted tiene derecho a:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Acceso:</strong> conocer qué datos personales tenemos sobre usted</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
            <li><strong>Cancelación:</strong> solicitar la eliminación de sus datos</li>
            <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos</li>
          </ul>
          <p className="mt-2">
            Para ejercer estos derechos, contáctenos en{' '}
            <a href="mailto:privacidad@cotizapro.mx" className="text-blue-600 dark:text-blue-400 hover:underline">
              privacidad@cotizapro.mx
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Retención de datos</h2>
          <p>
            Conservamos sus datos mientras su cuenta esté activa o sea necesario para prestar servicios. Al cancelar su cuenta, eliminamos o anonimizamos sus datos dentro de los 30 días siguientes, salvo que la ley exija conservarlos por más tiempo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política periódicamente. Le notificaremos cambios significativos por correo electrónico o mediante un aviso destacado en el servicio antes de que el cambio entre en vigor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Contacto</h2>
          <p>
            Si tiene preguntas sobre esta política de privacidad, contáctenos en:{' '}
            <a href="mailto:privacidad@cotizapro.mx" className="text-blue-600 dark:text-blue-400 hover:underline">
              privacidad@cotizapro.mx
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
