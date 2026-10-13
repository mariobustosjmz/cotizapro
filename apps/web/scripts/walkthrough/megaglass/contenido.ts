/** Textos del documento de presentación para MEGAGLASS. Cada afirmación está verificada contra el producto. */
import { EXTRA_USER_MONTHLY_PRICE, PLANS, PLAN_ORDER } from '../../../lib/plans/catalog'
import { formatMxn, monthlyCost } from '../../../lib/plans/pricing'

export interface Module {
  readonly id: string
  readonly title: string
  readonly purpose: string
  readonly inAccount: string
  readonly tryIt: readonly string[]
  readonly shots: readonly string[]
}

export const BEFORE_AFTER: readonly (readonly [string, string, string])[] = [
  ['Cotizar', 'Excel, calculadora o mensajes de WhatsApp; cada vendedor calcula distinto.', 'Se capturan medidas y opciones; el sistema calcula vidrio, cantos, herrajes, desperdicio e instalación con sus precios y genera el PDF.'],
  ['Dar seguimiento', 'Se olvida a quién se le mandó precio y quién no contestó.', 'Cada cotización tiene estado (enviada, vista, aceptada…) y hay recordatorios con fecha.'],
  ['Cobrar', 'Anticipos y saldos anotados en libreta.', 'Pagos por cotización con barra de avance y saldo pendiente siempre visible.'],
  ['Organizar al equipo', 'Mediciones e instalaciones por llamada o grupo de WhatsApp.', 'Agenda semanal con responsable, dirección y notas de cada visita.'],
  ['Conseguir clientes', 'Solo recomendación de boca en boca.', 'Página pública con servicios, trabajos realizados, reseñas verificadas, botón de WhatsApp y QR.'],
  ['Saber cómo va el negocio', 'Se sabe al final del mes, si acaso.', 'Analítica de cotizaciones, conversión, cobrado y saldo por cobrar en tiempo real.'],
]

export const MODULES: readonly Module[] = [
  { id: 'inicio', title: 'Inicio', purpose: 'Resumen del negocio al abrir el sistema: clientes, cotizaciones por estado, ingresos de trabajos ganados, recordatorios vencidos y accesos rápidos.', inAccount: 'Diez cotizaciones en distintos estados y cinco recordatorios, uno de ellos para cobrar un saldo hoy.', tryIt: ['En "Cotizaciones recientes" abran la del Condominio Torres del Lago para ver un borrador grande.'], shots: ['inicio-escritorio'] },
  { id: 'solicitudes', title: 'Solicitudes', purpose: 'Bandeja de los pedidos de cotización que llegan desde su página pública, con medidas y mensaje del cliente. Se contestan por WhatsApp o se convierten en cotización con un clic.', inAccount: 'Dos solicitudes nuevas (Paola Ríos y Jorge Elizalde), una ya convertida (Andrea Garza) y una descartada por ser publicidad.', tryIt: ['Conviertan la solicitud de Paola Ríos en cotización.'], shots: ['solicitudes-escritorio'] },
  { id: 'clientes', title: 'Clientes', purpose: 'Cartera con datos de contacto, empresa, dirección, etiquetas y notas; desde cada cliente se ven sus cotizaciones.', inAccount: 'Diez clientes: particulares, comercios, un despacho de arquitectos y un condominio.', tryIt: ['Busquen "Salinas" y abran su ficha.'], shots: ['clientes-escritorio'] },
  { id: 'cotizaciones', title: 'Cotizaciones: lista y tablero', purpose: 'Todas las cotizaciones con folio, cliente, total y estado. El tablero (Kanban) permite mover cada cotización de etapa arrastrándola: borrador, enviada, vista, aceptada, en instalación, completada y cobrada.', inAccount: 'El ciclo completo, desde un borrador de 20 ventanas hasta trabajos cobrados y uno rechazado.', tryIt: ['Cambien a la vista "Kanban" y muevan la cotización de Laura Méndez a "Aceptadas".'], shots: ['cotizaciones-escritorio', 'kanban-escritorio'] },
  { id: 'nueva', title: 'Nueva cotización por medidas', purpose: 'El corazón del sistema. Para productos configurables (cancel de baño, ventana, espejo, vidrio a la medida) se capturan ancho, alto, piezas y opciones; el motor calcula m², cantos por metro lineal, kit de herrajes, 10 % de desperdicio e instalación, y muestra el desglose antes de guardar.', inAccount: 'Catálogo de vidrio, aluminio y cancelería precargado con listas de precios editables.', tryIt: ['Cotización de un cancel de 1.40 × 1.90 m: cambien el espesor de 9 a 10 mm y el kit de herrajes, y vean cómo cambia el total al instante.'], shots: ['nueva-cotizacion-escritorio'] },
  { id: 'detalle', title: 'Detalle de cotización: pagos, fotos, agenda y PDF', purpose: 'Todo lo de un trabajo en un solo lugar: partidas, pagos (anticipo, parcial, liquidación y método), avance de cobro, fotos de antes y después, eventos de agenda, términos y botón para descargar el PDF.', inAccount: 'COT de Andrea Garza: cobrada al 100 %, dos pagos, fotos de antes y después, medición e instalación registradas. COT del Despacho Salinas: 50 % cobrado y obra en tres etapas.', tryIt: ['Registren el pago del saldo de Carlos Cantú y marquen su cotización como cobrada.', 'Descarguen el PDF de cualquier cotización.'], shots: ['detalle-andrea-escritorio', 'detalle-salinas-escritorio'] },
  { id: 'catalogo', title: 'Catálogo y listas de precios', purpose: 'Servicios con precio "desde" y listas de precios por espesor, línea, acabado o kit. Un cambio de precio aplica solo a cotizaciones nuevas: las guardadas conservan el precio con el que se hicieron. Se puede subir o bajar toda una lista con un porcentaje.', inAccount: 'Seis listas (vidrio flotado, templado, espejo, ventana de aluminio, herrajes y procesos de canto) con precios de ejemplo.', tryIt: ['Cambien el precio del templado de 9 mm y hagan una cotización nueva para comprobarlo.'], shots: ['listas-precios-escritorio', 'servicios-escritorio'] },
  { id: 'plantillas', title: 'Plantillas', purpose: 'Combos que se repiten (por ejemplo cancel + espejo) para cotizar en segundos, con descuento y etiqueta de promoción con vigencia.', inAccount: '"Paquete Baño Completo" con Promo Otoño 5 % y "Visita de medición".', tryIt: ['Creen una cotización eligiendo la plantilla "Paquete Baño Completo".'], shots: ['plantillas-escritorio'] },
  { id: 'agenda', title: 'Agenda', purpose: 'Semana de mediciones, instalaciones y visitas con responsable, dirección y notas. Cada evento se liga a su cotización.', inAccount: 'Instalación de espejos en el gimnasio, etapas del despacho y la medición del condominio.', tryIt: ['Creen una medición para mañana y asígnenla a "Instalación MEGAGLASS".'], shots: ['agenda-escritorio'] },
  { id: 'recordatorios', title: 'Recordatorios', purpose: 'Tareas con fecha y prioridad: dar seguimiento, cobrar saldos o mantenimientos periódicos.', inAccount: 'Cobrar el saldo de Carlos Cantú hoy, seguimiento a Laura Méndez, segundo pago del despacho y un mantenimiento semestral.', tryIt: ['Marquen como completado el seguimiento a Laura Méndez.'], shots: ['recordatorios-escritorio'] },
  { id: 'pagina', title: 'Mi página pública', purpose: 'Página de MEGAGLASS para compartir por WhatsApp, redes o con su tarjeta QR: servicios con precio "desde", trabajos realizados, reseñas verificadas y botón para pedir cotización. Solo pueden dejar reseña los clientes con un trabajo registrado en el sistema, por eso aparecen como verificadas.', inAccount: 'Página publicada con cuatro trabajos, tres reseñas y calificación de 4.7.', tryIt: ['Ábranla en su celular con el QR de la portada y pidan una cotización como si fueran un cliente.'], shots: ['mi-pagina-escritorio', 'pagina-publica-escritorio'] },
  { id: 'analitica', title: 'Analítica', purpose: 'Cotizaciones por estado, embudo de conversión, ingresos cobrados por semana, saldo por cobrar, servicios más vendidos y estado de recordatorios.', inAccount: 'Métricas calculadas con los pagos y estados reales del caso.', tryIt: ['Comparen "Saldo pendiente" con los pagos que faltan en Cotizaciones.'], shots: ['analitica-escritorio'] },
  { id: 'equipo', title: 'Equipo, roles y configuración', purpose: 'Usuarios con rol: Dirección (todo), Ventas (administra catálogo, página y equipo) e Instalación (ve cotizaciones y agenda, sube fotos y convierte solicitudes, pero no cambia precios, catálogo, página ni equipo, y no puede borrar pagos). En Configuración van los datos de la empresa, vigencia, términos y la liga del logo para los PDF.', inAccount: 'Tres usuarios, uno por rol, para que vean qué ve cada persona.', tryIt: ['Entren con el usuario de Instalación e intenten cambiar un precio: el sistema no se los permite.'], shots: ['equipo-escritorio', 'configuracion-escritorio'] },
]

export const MOBILE_SHOTS: readonly (readonly [string, string])[] = [
  ['inicio-celular', 'Inicio'],
  ['nueva-cotizacion-celular', 'Cotizar por medidas'],
  ['detalle-andrea-celular', 'Detalle con Enviar y PDF'],
  ['agenda-celular', 'Agenda'],
  ['solicitudes-celular', 'Solicitudes'],
]

export const DAY_ONE: readonly { readonly when: string; readonly what: string; readonly who: string }[] = [
  { when: 'Día 1 · 9:00 (45 min)', what: 'Entrar con su cuenta definitiva, revisar datos de la empresa, vigencia, términos y logo en Configuración.', who: 'Dirección' },
  { when: 'Día 1 · 10:00 (1 h)', what: 'Ajustar listas de precios con sus precios reales (vidrio, templado, espejo, ventanas, herrajes, cantos). Lo más rápido: aplicar un porcentaje por lista y corregir las filas que cambien.', who: 'Dirección o Ventas' },
  { when: 'Día 1 · 11:00 (30 min)', what: 'Dar de alta al equipo (Ventas e Instalación) y revisar que cada quien entre desde su celular.', who: 'Dirección' },
  { when: 'Día 1 · 12:00 (30 min)', what: 'Completar y publicar su página: frase, zona de servicio, WhatsApp real y 3 a 5 fotos de trabajos. Descargar la tarjeta QR.', who: 'Ventas' },
  { when: 'Día 1 · tarde', what: 'Hacer las cotizaciones del día en CotizaPro (aunque también se manden como siempre) y agendar las mediciones.', who: 'Ventas' },
  { when: 'Días 2 a 5', what: 'Registrar anticipos y liquidaciones, subir fotos de cada instalación, pedir reseña al cobrar y compartir la página en WhatsApp y redes.', who: 'Todo el equipo' },
  { when: 'Fin de la semana 1', what: 'Revisar Analítica juntos: cuántas se enviaron, cuántas se ganaron y cuánto falta por cobrar. Ajustar precios o plantillas.', who: 'Dirección' },
]

export const NEEDED: readonly string[] = [
  'Su lista de precios actual (Excel, foto o PDF) para cargarla o validarla.',
  'Logo en imagen (PNG) y, si tienen, color de marca.',
  'Número de WhatsApp de ventas para el botón de la página pública.',
  'Nombre y correo de cada persona del equipo y su rol.',
  'Sus términos y condiciones de cotización (anticipo, garantía, vigencia).',
  'De 3 a 5 fotos reales de trabajos terminados para la página.',
]

export const FAQ: readonly (readonly [string, string])[] = [
  ['¿Hay que instalar algo?', 'No. Se usa desde el navegador de la computadora, tableta o celular con la dirección de acceso.'],
  ['¿Funciona bien en el celular?', 'Sí. Se revisó módulo por módulo en celular y tableta; cotizar por medidas, registrar pagos, subir fotos y agendar funcionan desde el teléfono.'],
  ['¿Puedo poner mis propios precios?', 'Sí. Las listas de precios se editan fila por fila o con un porcentaje para toda la lista. Los precios de este documento son de ejemplo.'],
  ['Si cambio un precio, ¿se modifican las cotizaciones que ya mandé?', 'No. Cada cotización guarda el precio con el que se hizo; el cambio aplica a las nuevas.'],
  ['¿Cómo calcula el precio de un cancel o una ventana?', 'Con las medidas calcula m² de vidrio o aluminio, metros lineales de canto, el kit de herrajes, 10 % de desperdicio e instalación, usando sus listas. El desglose se ve antes de guardar.'],
  ['¿Cómo le llega la cotización a mi cliente?', 'Con el botón "Enviar" y la opción WhatsApp se abre su propio WhatsApp con el mensaje escrito (folio, total y vigencia); ahí adjuntan el PDF que descargan con el botón "PDF". El correo desde la plataforma y el envío automático por la API oficial de WhatsApp llegan próximamente.'],
  ['¿Puedo poner mi logo?', 'Sí. En Configuración se coloca la liga de la imagen del logo y aparece en los PDF.'],
  ['¿Qué ve cada persona de mi equipo?', 'Dirección ve y administra todo. Ventas administra catálogo, precios, página y equipo. Instalación ve cotizaciones y agenda, sube fotos y convierte solicitudes, pero no cambia precios, catálogo, página ni equipo, ni borra pagos.'],
  ['¿Las reseñas son reales?', 'Solo puede dejar reseña un cliente con un trabajo registrado en el sistema, mediante una liga única. Por eso aparecen como "verificadas" y no se pueden inventar desde fuera.'],
  ['¿Cómo me piden cotización mis clientes?', 'Desde su página pública o la tarjeta QR. La solicitud llega a "Solicitudes" con medidas y teléfono, y se convierte en cotización con un clic.'],
  ['¿Lleva el control de anticipos y saldos?', 'Sí. Cada cotización registra pagos por tipo y método, muestra el avance y el saldo pendiente, y Analítica suma lo cobrado y lo que falta por cobrar.'],
  ['¿Emite facturas (CFDI)?', 'Todavía no. Se registra el pago en CotizaPro y la factura se sigue haciendo con su sistema actual.'],
  ['¿Mis datos están seguros?', 'Cada empresa ve solo su información (separación por empresa en la base de datos), la conexión va cifrada (HTTPS) y se hace respaldo diario de la información.'],
  ['¿Qué pasa con los datos de esta cuenta de prueba?', 'Son ficticios (clientes, teléfonos y correos inventados; las fotos son ilustraciones). La cuenta de prueba se conserva para practicar y su cuenta definitiva arranca limpia, con su catálogo.'],
  ['¿Cuánto cuesta?', `La cuenta de prueba no genera cobros. Los planes, IVA incluido, son: ${PLAN_ORDER.filter((id) => id !== 'free').map((id) => `${PLANS[id].name} ${formatMxn(PLANS[id].monthlyPrice)} al mes con ${PLANS[id].includedUsers} ${PLANS[id].includedUsers === 1 ? 'usuario' : 'usuarios'}`).join(', ')}; cada usuario adicional cuesta ${formatMxn(EXTRA_USER_MONTHLY_PRICE)} al mes. Con sus 3 usuarios, MEGAGLASS quedaría en el plan Taller: ${formatMxn(monthlyCost('pro', 3).total)} al mes. La contratación con tarjeta se activa próximamente; su opinión sobre estos precios está en el cuestionario.`],
  ['¿Funciona sin internet?', 'No; necesita conexión, igual que WhatsApp.'],
  ['¿Y si olvido la contraseña?', 'Por ahora, pídanle a Mario Bustos que la restablezca. La recuperación por correo se activa junto con el envío automático de correos.'],
]

export const CHALLENGES: readonly string[] = [
  'Entrar desde el celular con el usuario de Dirección y revisar Inicio.',
  'Convertir la solicitud de Paola Ríos en cotización (cancel de 1.40 × 1.90 m) y probar distintos espesores y herrajes.',
  'Enviar esa cotización por WhatsApp a ustedes mismos con el botón "Enviar" y adjuntar el PDF.',
  'Registrar el pago del saldo de Carlos Cantú y marcar su cotización como cobrada.',
  'Mover la cotización de Laura Méndez en el tablero Kanban.',
  'Cambiar el precio del templado de 9 mm y comprobarlo en una cotización nueva.',
  'Crear una medición en la Agenda y asignarla a Instalación.',
  'Subir una foto real de un trabajo a una cotización y marcarla "En mi página".',
  'Abrir la página pública con el QR y pedir una cotización como cliente.',
  'Entrar con el usuario de Instalación y comparar lo que ve.',
]

export const RATINGS: readonly string[] = [
  'Facilidad para cotizar un cancel o una ventana',
  'Exactitud del cálculo comparado con como cotizan hoy',
  'Uso desde el celular',
  'Aspecto del PDF que recibe el cliente',
  'Control de pagos y saldos',
  'Agenda de mediciones e instalaciones',
  'Página pública y reseñas',
  'Utilidad general para MEGAGLASS',
]

export const OPEN_QUESTIONS: readonly string[] = [
  '¿Qué productos o cálculos de su día a día no aparecen o se calculan distinto?',
  '¿Qué fue lo más confuso o lo que más tardaron en encontrar?',
  '¿Qué les gustaría que hiciera y no hace (por ejemplo facturas, envío automático, órdenes de taller)?',
  '¿Quiénes del equipo lo usarían y desde qué dispositivo?',
  '¿Lo usarían a partir de mañana? ¿Qué tendría que pasar para que sí?',
]

export const LIMITS: readonly string[] = [
  'No emite facturas CFDI.',
  'El envío por WhatsApp abre su propia app con el mensaje listo; el envío automático, el correo desde la plataforma y la recuperación de contraseña por correo se activan en la siguiente etapa.',
  'No recibe pagos en línea; registra los pagos que ustedes reciben.',
  'Las fotos del caso son ilustraciones; las reales las suben ustedes desde cada cotización.',
]

/** Preguntas de precio para el piloto: validan disposición a pagar antes de activar el cobro. */
export const PRICE_QUESTIONS: readonly string[] = [
  '¿Cuánto estarían dispuestos a pagar al mes por usarlo en MEGAGLASS?',
  '¿A partir de qué precio les parecería caro y ya no lo contratarían?',
  '¿A qué precio les parecería tan barato que dudarían de que sirve?',
  `¿Les parece justo cobrar ${formatMxn(EXTRA_USER_MONTHLY_PRICE)} al mes por cada usuario adicional? ¿Cuántas personas lo usarían?`,
  '¿Preferirían pagar cada mes o una vez al año con descuento?',
]

export const PRICE_TABLE: readonly (readonly [string, string, string])[] = PLAN_ORDER.map((id) => [
  PLANS[id].name,
  formatMxn(PLANS[id].monthlyPrice),
  PLANS[id].allowsExtraUsers ? `${PLANS[id].includedUsers} + ${formatMxn(EXTRA_USER_MONTHLY_PRICE)} c/u adicional` : `${PLANS[id].includedUsers}`,
])
