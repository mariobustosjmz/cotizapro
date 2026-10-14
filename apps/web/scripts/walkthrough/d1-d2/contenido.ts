/** Textos del documento de evidencia D1 + D2: qué muestra cada captura, endpoints y archivos de código. */

export interface StepInfo {
  readonly area: string
  readonly what: string
  readonly apis: readonly string[]
  readonly code: readonly string[]
}

export interface SceneInfo {
  readonly n: number
  readonly part: 'D1' | 'D2'
  readonly title: string
}

export const SCENES: readonly SceneInfo[] = [
  { n: 1, part: 'D1', title: 'Configuración del anticipo' },
  { n: 2, part: 'D1', title: 'Cotización y liga para el cliente' },
  { n: 3, part: 'D1', title: 'La liga pública sin sesión' },
  { n: 4, part: 'D1', title: 'El cliente acepta' },
  { n: 5, part: 'D1', title: 'El negocio se entera' },
  { n: 6, part: 'D2', title: 'Facturación de Megaglass' },
  { n: 7, part: 'D2', title: 'Panel de superadmin' },
  { n: 8, part: 'D2', title: 'Suspender un plan' },
  { n: 9, part: 'D2', title: 'Cuenta vencida en solo lectura' },
  { n: 10, part: 'D2', title: 'Activar o renovar' },
  { n: 11, part: 'D2', title: 'Cuenta renovada' },
  { n: 12, part: 'D2', title: 'Correos de vencimiento' },
]

const SETTINGS: StepInfo = {
  area: 'Panel · Configuración → Empresa',
  what: 'Sección «Anticipo» del perfil de la empresa: porcentaje por omisión, liga de pago (Mercado Pago u otra) e instrucciones. El cliente ve estos datos al abrir la liga de su cotización; el dinero llega directo al negocio, CotizaPro no lo toca.',
  apis: ['PATCH /api/settings/organization', 'RPC update_org_settings (valida deposit_*)'],
  code: ['apps/web/components/settings/deposit-settings.tsx', 'apps/web/app/api/settings/organization/route.ts', 'apps/web/supabase/migrations/041_public_quote_share.sql'],
}

const PUBLIC_PAGE: StepInfo = {
  area: 'Liga pública /c/[token] · sin sesión',
  what: 'Lo que ve el cliente al abrir la liga, sin cuenta ni contraseña: datos del negocio con su color, conceptos, IVA y total, la tarjeta de anticipo con el botón «Pagar anticipo» y los botones Aceptar, Tengo dudas (WhatsApp) y No me interesa. Al abrirla, la cotización pasa a «Vista».',
  apis: ['RPC get_public_quote', 'POST /api/public/quotes/[token]/view', 'GET /api/public/quotes/[token]/pdf'],
  code: ['apps/web/app/c/[token]/page.tsx', 'apps/web/components/public-quote/deposit-card.tsx', 'apps/web/components/public-quote/quote-actions.tsx'],
}

const BILLING: StepInfo = {
  area: 'Panel · Facturación',
  what: 'Tarjetas de plan actual (con la línea de estado y su vencimiento), usuarios y total mensual; las cuatro tarjetas de plan con su botón y la tabla «Qué incluye cada plan».',
  apis: ['GET /dashboard/billing (Server Component)'],
  code: ['apps/web/app/(dashboard)/dashboard/billing/page.tsx', 'apps/web/components/billing/billing-summary-cards.tsx', 'apps/web/components/billing/plan-cta.tsx', 'apps/web/components/billing/plan-limits-table.tsx', 'apps/web/lib/billing/expiry-copy.ts'],
}

const ADMIN_CODE = ['apps/web/app/admin/page.tsx', 'apps/web/components/admin/organizations-table.tsx', 'apps/web/components/admin/organization-actions.tsx']

export const INFO: Readonly<Record<string, StepInfo>> = {
  'empresa-anticipo-antes': { ...SETTINGS, what: `${SETTINGS.what} Antes: el porcentaje (50 %) ya estaba, pero la liga y las instrucciones estaban vacías.` },
  'empresa-anticipo-guardado': { ...SETTINGS, what: `${SETTINGS.what} Después de escribir la liga y las instrucciones y pulsar Guardar; los valores se releyeron tras recargar.` },
  'empresa-anticipo': SETTINGS,
  'detalle-cotizacion': {
    area: 'Panel · Detalle de cotización',
    what: 'Cotización real de la cuenta demo, en estado Enviada, con tres partidas configurables y su total con IVA. Abajo, la tarjeta nueva «Respuesta del cliente» todavía dice que el cliente no abre la liga.',
    apis: ['GET /api/quotes/[id]'],
    code: ['apps/web/app/(dashboard)/dashboard/quotes/[id]/page.tsx', 'apps/web/components/quotes/client-response-card.tsx'],
  },
  'panel-liga': {
    area: 'Panel · Enviar cotización',
    what: 'Diálogo «Enviar Cotización» con WhatsApp elegido y enviado. El servidor genera una liga nueva de un solo token y arma el mensaje de WhatsApp («Revísala y acéptala aquí: …»). El panel «Liga para ver y aceptar» muestra la liga una sola vez para copiarla o revocarla. Nada se manda solo: el botón «Abrir WhatsApp» abre el chat con el mensaje listo.',
    apis: ['POST /api/quotes/[id]/send (send_via: whatsapp)', 'GET/POST/DELETE /api/quotes/[id]/share'],
    code: ['apps/web/components/dashboard/quote-share-dialog.tsx', 'apps/web/components/dashboard/quote-share-link-panel.tsx', 'apps/web/hooks/use-quote-share-link.ts', 'apps/web/lib/quotes/share-link.ts'],
  },
  'liga-publica-escritorio': PUBLIC_PAGE,
  'liga-publica-celular': { ...PUBLIC_PAGE, what: `${PUBLIC_PAGE.what} Misma liga en un celular de 390 × 844, que es como la abren los clientes desde WhatsApp.` },
  'aceptar-confirmar': {
    area: 'Liga pública /c/[token] · celular',
    what: 'Al pulsar «Aceptar cotización» aparece la confirmación: el nombre es opcional y se aclara que se guarda fecha y hora, sin ser firma electrónica.',
    apis: [],
    code: ['apps/web/components/public-quote/respond-panels.tsx', 'apps/web/hooks/use-quote-response.ts'],
  },
  'aceptada-celular': {
    area: 'Liga pública /c/[token] · celular',
    what: 'Después de confirmar: aviso verde con fecha, hora y nombre; los botones Aceptar y No me interesa desaparecen y el anticipo sigue a la vista para pagar.',
    apis: ['POST /api/public/quotes/[token]/respond (action: accept)', 'RPC respond_public_quote'],
    code: ['apps/web/app/api/public/quotes/[token]/respond/route.ts', 'apps/web/components/public-quote/quote-status-banner.tsx', 'apps/web/lib/public-quote/state.ts'],
  },
  'campana-aceptada': {
    area: 'Panel · Campana de notificaciones',
    what: 'La campana del negocio muestra «Tu cliente aceptó la cotización» con el folio y el nombre que escribió el cliente, junto con el aviso «WhatsApp enviado» del paso 2.',
    apis: ['GET /api/notifications', 'PATCH /api/notifications/[id]'],
    code: ['apps/web/components/dashboard/notification-bell.tsx', 'apps/web/lib/notifications/quote-notification-item.ts', 'apps/web/app/api/notifications/route.ts'],
  },
  'detalle-respuesta-cliente': {
    area: 'Panel · Detalle de cotización',
    what: 'La cotización pasó sola a «Aceptada». La tarjeta «Respuesta del cliente» registra cuándo la vio y cuándo y quién la aceptó desde la liga. Aquí también se puede cambiar el anticipo solo para esta cotización.',
    apis: ['GET /api/quotes/[id]', 'PATCH /api/quotes/[id] (deposit_percent)'],
    code: ['apps/web/components/quotes/client-response-card.tsx', 'apps/web/lib/public-quote/activity.ts'],
  },
  'facturacion-megaglass': { ...BILLING, what: `${BILLING.what} Megaglass tiene Taller sin fecha de vencimiento (cuenta de piloto) y 3 de 3 usuarios.` },
  'admin-tabla': {
    area: 'Plataforma · /admin (solo superadmin)',
    what: 'Panel de plataforma con todas las empresas: plan, vencimiento, usuarios y alta, con buscador y acciones Activar o renovar, Historial y Suspender. Quien no es superadmin recibe 404 en esta ruta.',
    apis: ['RPC admin_list_organizations', 'is_platform_admin()'],
    code: [...ADMIN_CODE, 'apps/web/app/admin/layout.tsx'],
  },
  'admin-historial-inicial': {
    area: 'Plataforma · /admin · Historial',
    what: 'Búsqueda «plomeria» y el historial de Plomería Don Beto antes del recorrido: sin movimientos.',
    apis: ['GET /api/admin/organizations/[id]/activations'],
    code: ['apps/web/components/admin/activation-history.tsx', 'apps/web/lib/admin/history-copy.ts'],
  },
  'suspender-dialogo': {
    area: 'Plataforma · /admin · Suspender',
    what: 'Diálogo de suspensión con motivo obligatorio. Advierte que la cuenta queda en solo lectura de inmediato y que sus datos no se borran.',
    apis: [],
    code: ['apps/web/components/admin/suspend-plan-dialog.tsx'],
  },
  'suspendida-fila': {
    area: 'Plataforma · /admin',
    what: 'Tras suspender, el vencimiento de Don Beto aparece en rojo como «Vencido». En la base, el periodo termina en ese momento y el estado pasa a canceled.',
    apis: ['POST /api/admin/organizations/[id]/suspend', 'RPC admin_suspend_plan'],
    code: ['apps/web/app/api/admin/organizations/[id]/suspend/route.ts', 'apps/web/supabase/migrations/042_billing_superadmin.sql'],
  },
  'beto-banner-vencido': {
    area: 'Panel de Don Beto · Inicio',
    what: 'Don Beto entra con su usuario y ve arriba una franja roja: su plan venció, la cuenta está en solo lectura y hay un botón Renovar que lleva a Facturación.',
    apis: ['GET /dashboard (layout carga el banner)'],
    code: ['apps/web/app/(dashboard)/layout.tsx', 'apps/web/components/dashboard/plan-expiry-banner.tsx', 'apps/web/lib/billing/dashboard-banner.ts'],
  },
  'beto-cliente-bloqueado': {
    area: 'Panel de Don Beto · Nuevo cliente',
    what: 'Intento de crear un cliente desde «Nuevo». El servidor responde 402 PLAN_EXPIRED y el formulario muestra el mensaje en español; también sale un aviso flotante con el mismo texto.',
    apis: ['POST /api/clients → 402 PLAN_EXPIRED', 'assertWritable() / org_is_writable()'],
    code: ['apps/web/app/(dashboard)/dashboard/clients/new/page.tsx', 'apps/web/lib/billing/writable.ts', 'apps/web/app/api/clients/route.ts'],
  },
  'beto-cotizaciones-lectura': {
    area: 'Panel de Don Beto · Cotizaciones',
    what: 'Con la cuenta vencida, la lista de cotizaciones se sigue viendo completa: solo lectura no esconde datos.',
    apis: ['GET /dashboard/quotes'],
    code: ['apps/web/app/(dashboard)/dashboard/quotes/page.tsx'],
  },
  'beto-facturacion-vencida': { ...BILLING, area: 'Panel de Don Beto · Facturación', what: 'Facturación con el plan vencido: etiqueta «Vencido», la línea «venció el … · solo lectura» y, en la tarjeta Taller, el total exacto para renovar. No hay ligas de Mercado Pago ni teléfono de soporte configurados en local, así que se muestra el texto de respaldo «Escríbenos a soporte para recibir tu liga».', code: [...BILLING.code, 'apps/web/lib/billing/checkout-option.ts'] },
  'activar-dialogo': {
    area: 'Plataforma · /admin · Activar o renovar',
    what: 'Diálogo para registrar un pago de Mercado Pago: plan (Taller), usuarios (1), meses (1) y referencia obligatoria. El total se calcula en pantalla con los precios del catálogo.',
    apis: [],
    code: ['apps/web/components/admin/activate-plan-dialog.tsx', 'apps/web/lib/billing/activation.ts'],
  },
  'activada-fila': {
    area: 'Plataforma · /admin',
    what: 'Tras activar, la fila de Don Beto muestra «Vence en 31 días»: el nuevo periodo empieza en este momento porque el anterior ya había vencido.',
    apis: ['POST /api/admin/organizations/[id]/activate', 'RPC admin_activate_plan'],
    code: ['apps/web/app/api/admin/organizations/[id]/activate/route.ts', 'apps/web/supabase/migrations/042_billing_superadmin.sql'],
  },
  'historial-final': {
    area: 'Plataforma · /admin · Historial',
    what: 'El historial guarda los dos movimientos con fecha, quién lo hizo y la referencia: la suspensión con su motivo y la activación con monto, meses y nueva fecha.',
    apis: ['GET /api/admin/organizations/[id]/activations'],
    code: ['apps/web/components/admin/activation-history.tsx', 'apps/web/lib/admin/history-copy.ts'],
  },
  'beto-panel-renovado': {
    area: 'Panel de Don Beto · Inicio',
    what: 'Después de renovar, Don Beto recarga su panel y ya no ve la franja roja. Tampoco aparece la amarilla, porque faltan más de 7 días para vencer.',
    apis: ['GET /dashboard'],
    code: ['apps/web/lib/billing/expiry.ts', 'apps/web/lib/billing/expiry-copy.ts'],
  },
  'beto-facturacion-renovada': { ...BILLING, area: 'Panel de Don Beto · Facturación', what: 'Facturación renovada: etiqueta «Activa» y la línea de estado con la nueva fecha de vencimiento.' },
  'correo-d3': {
    area: 'Correo · aviso de vencimiento (vista previa)',
    what: 'Correo que el cron de avisos manda 3 días antes de vencer. Explica qué pasa al vencer y lleva un botón «Renovar plan». Es una vista previa local: no se envió.',
    apis: ['GET /api/cron/billing-notices (lo envía en producción)'],
    code: ['apps/web/lib/email/plan-expiry-email.ts', 'apps/web/lib/billing/notices.ts', 'apps/web/app/api/cron/billing-notices/route.ts'],
  },
  'correo-d0': {
    area: 'Correo · aviso de vencimiento (vista previa)',
    what: 'Correo del día del vencimiento: avisa que la cuenta quedó en solo lectura y que los datos no se borran. Es una vista previa local: no se envió.',
    apis: ['GET /api/cron/billing-notices (lo envía en producción)'],
    code: ['apps/web/lib/email/plan-expiry-email.ts', 'apps/web/lib/billing/notices.ts'],
  },
}

export const SUMMARY: readonly (readonly [string, string])[] = [
  ['El cliente acepta desde una liga', 'Cada cotización enviada lleva una liga que el cliente abre en su celular sin crear cuenta. Ve los conceptos y el total, acepta con un botón y deja su nombre.'],
  ['Anticipo a la vista', 'El negocio define en Configuración el porcentaje, su liga de Mercado Pago y las instrucciones. El cliente ve el monto exacto y el botón «Pagar anticipo»; el dinero llega directo al negocio.'],
  ['El negocio se entera solo', 'Al aceptar, la cotización cambia sola a «Aceptada», la campana avisa y el detalle guarda cuándo y quién la aceptó.'],
  ['Planes con Mercado Pago', 'Facturación muestra el plan, el vencimiento, los usuarios, el total mensual, los cuatro planes y sus límites, y cómo pagar o renovar.'],
  ['Solo lectura al vencer', 'Si el plan vence, la cuenta no se bloquea ni se borra: se puede ver y descargar todo, pero no crear, editar ni enviar hasta renovar. Lo indica una franja roja y un mensaje claro.'],
  ['Superadmin', 'Desde /admin, quien opera la plataforma activa, renueva o suspende planes con la referencia de Mercado Pago. Cada movimiento queda en el historial.'],
  ['Avisos por correo', 'Un proceso diario manda correos 7, 3 y 1 día antes de vencer y el día que vence, cada uno con un botón para renovar.'],
]

export const VERIFICATION: readonly (readonly [string, string, string])[] = [
  ['Build de producción (next build)', 'OK', 'Reportado por la implementación. No se repitió aquí porque compartiría la carpeta .next con el servidor de desarrollo encendido.'],
  ['Vitest (unitarias)', '409/409', 'Re-ejecutado en este recorrido: 63 archivos, 409 pruebas aprobadas.'],
  ['SQL public_quote_security (041)', '49 / 0', 'Re-ejecutado (transacción con ROLLBACK).'],
  ['SQL showcase_security', '20 / 0', 'Re-ejecutado (transacción con ROLLBACK).'],
  ['SQL billing_superadmin (042 A)', '43 / 0', 'Re-ejecutado (transacción con ROLLBACK).'],
  ['SQL billing_notices (042 B)', '20 / 0', 'Re-ejecutado (transacción con ROLLBACK).'],
  ['SQL client_reminders_cron (042 C)', '21 / 0', 'Re-ejecutado (transacción con ROLLBACK).'],
  ['E2E 25-plan-billing', '5/5', 'Reportado por la implementación. No se repitió: usa API y ajusta datos de Don Beto.'],
  ['E2E 25-public-quote', '6/6', 'Reportado por la implementación. No se repitió: crea cotizaciones de prueba por API.'],
]

export const EXCEPTIONS: readonly (readonly [string, string])[] = [
  ['Dar y quitar superadmin', 'No existe pantalla para hacerlo, por diseño (docs/CRON_SETUP.md): se hace a mano en la base. Se usaron grantPlatformAdmin y revokePlatformAdmin de apps/web/e2e/helpers/billing-admin.ts (solo operan sobre Supabase local).'],
  ['Limpieza final de Plomería Don Beto', 'restoreDonBeto() del mismo helper la deja en plan pro, activa, sin vencimiento, sin proveedor ni referencia. Se verificó con un SELECT de solo lectura (tabla «Antes y después»). Las dos filas de plan_activations de este recorrido (suspensión y MP-EVIDENCIA-001) se dejan como evidencia del historial; llevan el prefijo MP-EVIDENCIA.'],
  ['Vista previa del correo de vencimiento', 'El correo se manda desde un cron, no desde una pantalla. Se renderizó localmente el HTML de buildPlanExpiryEmail (d3 y d0) y se capturó. No se envió nada ni cambió ningún dato.'],
  ['Lecturas de la base', 'Los «antes y después» de Don Beto y de platform_admins se leyeron con SELECT en una sesión de solo lectura (default_transaction_read_only). No se escribió nada por SQL.'],
]
