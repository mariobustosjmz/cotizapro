import type { CaseClient, CaseQuote, CaseReminder, CaseRequest } from './tipos'

/** Clientes ficticios del caso (teléfonos 81 5550 xxxx y correos example.com, que no existen). */
export const CLIENTS: readonly CaseClient[] = [
  { key: 'andrea', name: 'Andrea Garza Villarreal', phone: '8155501001', email: 'andrea.garza@example.com', address: 'Paseo de los Leones 2210, Col. Cumbres', city: 'Monterrey', postalCode: '64610', tags: ['página pública'], notes: 'Llegó por la página pública. Prefiere WhatsApp.' },
  { key: 'salinas', name: 'Arq. Mariana Salinas', company: 'Despacho Salinas Arquitectos', phone: '8155501002', email: 'mariana@example.com', address: 'Calzada del Valle 400, Col. Del Valle', city: 'San Pedro Garza García', postalCode: '66220', tags: ['corporativo', 'recurrente'], notes: 'Oficinas nuevas del despacho, obra en tres etapas.' },
  { key: 'fuerza', name: 'Héctor Leal', company: 'Gimnasio Fuerza Regia', phone: '8155501003', email: 'gerencia.fuerza@example.com', address: 'Av. Lincoln 3550, Col. Mitras Norte', city: 'Monterrey', postalCode: '64320', tags: ['comercio'] },
  { key: 'nogalera', name: 'Rosa Elizondo', company: 'Restaurante La Nogalera', phone: '8155501004', address: 'Av. Vasconcelos 150 Ote., Col. Del Valle', city: 'San Pedro Garza García', postalCode: '66220', tags: ['comercio', 'urgente'] },
  { key: 'cantu', name: 'Carlos Cantú Treviño', phone: '8155501005', email: 'carlos.cantu@example.com', address: 'Río Nazas 330, Col. Roma', city: 'Monterrey', postalCode: '64700', tags: [] },
  { key: 'laura', name: 'Laura Méndez Ríos', phone: '8155501006', email: 'laura.mendez@example.com', address: 'Hacienda Las Palmas 118, Col. Las Puentes', city: 'San Nicolás de los Garza', postalCode: '66460', tags: [] },
  { key: 'contry', name: 'Dra. Paulina Ochoa', company: 'Clínica Dental Contry', phone: '8155501007', email: 'contacto.contry@example.com', address: 'Av. Eugenio Garza Lagüera 2600, Col. Contry', city: 'Monterrey', postalCode: '64860', tags: ['comercio'] },
  { key: 'trevino', name: 'Roberto Treviño', phone: '8155501008', address: 'Privada Aurora 45, Col. Linda Vista', city: 'Guadalupe', postalCode: '67130', tags: [] },
  { key: 'torres', name: 'Administración Torres del Lago', company: 'Condominio Torres del Lago', phone: '8155501009', email: 'admin.torresdellago@example.com', address: 'Av. Constitución 2050, Col. Obispado', city: 'Monterrey', postalCode: '64060', tags: ['corporativo'] },
  { key: 'elizondo', name: 'Familia Elizondo', phone: '8155501010', address: 'Sierra Madre 909, Col. Colinas de San Jerónimo', city: 'Monterrey', postalCode: '64630', tags: ['recurrente'] },
]

const SHOWER = 'Cancel de baño templado'

/** Cada cotización cuenta una parte de la historia; `story` se usa en el documento de presentación. */
export const QUOTES: readonly CaseQuote[] = [
  {
    key: 'elizondo', client: 'elizondo', story: 'Trabajo de hace mes y medio: ventanas y cancel, cobrado y con reseña de 4 estrellas.',
    created: { day: -45, hour: 11 }, status: 'cobrado', sent: -45, viewed: -44, accepted: -43,
    lines: [
      { service: 'Ventana de aluminio', input: { ancho: 1500, alto: 1200, piezas: 2, linea: 'serie-2', acabado: 'blanco', mosquitero: true, instalacion: true } },
      { service: SHOWER, input: { ancho: 1200, alto: 1900, piezas: 1, espesor: '9', herraje: 'corredizo-aluminio', instalacion: true } },
    ],
    notes: 'Incluye retiro de las ventanas anteriores.',
    payments: [{ when: -43, share: 0.5, type: 'anticipo', method: 'transferencia', notes: 'Anticipo para fabricación.' }, { when: -32, share: 'resto', type: 'liquidacion', method: 'transferencia', notes: 'Liquidación al entregar.' }],
    events: [{ title: 'Instalación ventanas y cancel · Familia Elizondo', type: 'instalacion', start: { day: -33, hour: 9 }, hours: 5, status: 'completado', assignee: 'instalacion', notes: 'Llevar sellador y escalera grande.' }],
    photos: [{ file: 'elizondo-despues.png', kind: 'after', caption: 'Ventanas serie 2 blancas y cancel corredizo', isPublic: true }],
    review: { rating: 4, comment: 'Buen trabajo y bien terminado. Tardaron un día más de lo prometido, pero avisaron con tiempo.', day: -30, reply: 'Gracias por su paciencia; ya ajustamos tiempos de fabricación para que no se repita.' },
  },
  {
    key: 'andrea', client: 'andrea', story: 'Caso estrella: pidió cotización desde la página, se midió, se aceptó, se instaló con fotos de antes y después, se cobró completo y dejó reseña verificada de 5 estrellas.',
    created: { day: -17, hour: 12 }, status: 'cobrado', sent: -17, viewed: -16, accepted: -15,
    lines: [
      { service: SHOWER, input: { ancho: 1500, alto: 1900, piezas: 1, espesor: '9', herraje: 'corredizo-acero', instalacion: true } },
      { service: 'Espejo a la medida', input: { ancho: 900, alto: 700, piezas: 1, espesor: '4', canto: 'biselado', instalacion: true } },
    ],
    notes: 'Medidas confirmadas en la visita del día de la solicitud.',
    payments: [{ when: -15, share: 0.5, type: 'anticipo', method: 'transferencia', notes: 'Anticipo al aceptar por WhatsApp.' }, { when: -6, share: 'resto', type: 'liquidacion', method: 'transferencia', notes: 'Liquidación el día de la instalación.' }],
    events: [
      { title: 'Medición · baño principal Andrea Garza', type: 'medicion', start: { day: -18, hour: 17 }, hours: 1, status: 'completado', assignee: 'ventas', notes: 'Medir regadera y muro del lavabo para el espejo.' },
      { title: 'Instalación cancel y espejo · Andrea Garza', type: 'instalacion', start: { day: -7, hour: 10 }, hours: 3, status: 'completado', assignee: 'instalacion', notes: 'Silicón transparente. Cliente pidió cuidar el piso de mármol.' },
    ],
    photos: [
      { file: 'bano-antes.png', kind: 'before', caption: 'Antes: regadera con cortina', isPublic: true },
      { file: 'bano-despues.png', kind: 'after', caption: 'Después: cancel templado 9 mm corredizo', isPublic: true },
    ],
    review: { rating: 5, comment: 'Desde que pedí la cotización en su página todo fue claro: me mandaron el PDF el mismo día, llegaron puntuales y el cancel quedó perfecto.', day: -5, reply: '¡Gracias, Andrea! Fue un gusto trabajar en su casa.' },
  },
  {
    key: 'salinas', client: 'salinas', story: 'Proyecto corporativo grande en instalación: 8 ventanas serie 3 negro, 2 canceles y mamparas de vidrio laminado, con 5 % de descuento, anticipo y tres etapas en la agenda.',
    created: { day: -12, hour: 10 }, status: 'en_instalacion', sent: -12, viewed: -11, accepted: -9, discountRate: 5,
    lines: [
      { service: 'Ventana de aluminio', input: { ancho: 1800, alto: 1500, piezas: 8, linea: 'serie-3', acabado: 'negro', mosquitero: false, instalacion: true } },
      { service: SHOWER, input: { ancho: 1200, alto: 1900, piezas: 2, espesor: '10', herraje: 'abatible-acero', instalacion: true } },
      { service: 'Vidrio a la medida', input: { ancho: 1200, alto: 1000, piezas: 6, tipo: 'laminado', espesor: '6', pulido: true, instalacion: true } },
    ],
    notes: 'Obra en tres etapas: fachada, baños y mamparas de sala de juntas. Descuento por volumen.',
    payments: [{ when: -9, share: 0.5, type: 'anticipo', method: 'transferencia', notes: 'Anticipo 50 % por transferencia del despacho.' }],
    events: [
      { title: 'Medición en obra · Despacho Salinas', type: 'medicion', start: { day: -11, hour: 9 }, hours: 2, status: 'completado', assignee: 'ventas', notes: 'Confirmar vanos con la arquitecta.' },
      { title: 'Etapa 1: ventanas de fachada · Despacho Salinas', type: 'instalacion', start: { day: -1, hour: 8 }, hours: 8, status: 'completado', assignee: 'instalacion', notes: '4 de 8 ventanas instaladas.' },
      { title: 'Etapa 2: ventanas restantes y baños · Despacho Salinas', type: 'instalacion', start: { day: 2, hour: 8 }, hours: 8, status: 'pendiente', assignee: 'instalacion', notes: 'Coordinar acceso con el residente de obra.' },
      { title: 'Etapa 3: mamparas sala de juntas · Despacho Salinas', type: 'instalacion', start: { day: 6, hour: 9 }, hours: 5, status: 'pendiente', assignee: 'instalacion', notes: 'Vidrio laminado llega el día anterior.' },
    ],
    photos: [
      { file: 'oficina-obra.png', kind: 'other', caption: 'Etapa 1 en proceso', isPublic: false },
      { file: 'oficina-avance.png', kind: 'other', caption: 'Etapa 1 terminada', isPublic: false },
    ],
  },
  {
    key: 'nogalera', client: 'nogalera', story: 'Urgencia de un comercio: reposición de vidrio estrellado el mismo día, cobrada en efectivo y con reseña.',
    created: { day: -10, hour: 9 }, status: 'cobrado', sent: -10, viewed: -10, accepted: -10,
    lines: [
      { service: 'Reposición de vidrio roto', quantity: 1 },
      { service: 'Vidrio a la medida', input: { ancho: 1600, alto: 1400, piezas: 1, tipo: 'claro', espesor: '6', pulido: true, instalacion: true } },
    ],
    notes: 'Servicio urgente el mismo día.',
    payments: [{ when: -10, share: 'resto', type: 'liquidacion', method: 'efectivo', notes: 'Pago completo en efectivo al terminar.' }],
    events: [{ title: 'Urgencia: vidrio estrellado · La Nogalera', type: 'visita_tecnica', start: { day: -10, hour: 12 }, hours: 2, status: 'completado', assignee: 'instalacion', notes: 'Retirar vidrio dañado con cuidado; local abierto.' }],
    photos: [
      { file: 'restaurante-antes.png', kind: 'before', caption: 'Antes: aparador estrellado', isPublic: true },
      { file: 'restaurante-despues.png', kind: 'after', caption: 'Después: vidrio claro 6 mm', isPublic: true },
    ],
    review: { rating: 5, comment: 'Les llamamos en la mañana y a mediodía ya estaba el vidrio nuevo. Muy recomendables.', day: -9 },
  },
  {
    key: 'cantu', client: 'cantu', story: 'Trabajo terminado con saldo pendiente: se entregó la puerta abatible y falta cobrar el 50 % restante (hay recordatorio).',
    created: { day: -14, hour: 16 }, status: 'completado', sent: -14, viewed: -13, accepted: -12,
    lines: [{ service: SHOWER, input: { ancho: 900, alto: 1900, piezas: 1, espesor: '10', herraje: 'abatible-acero', instalacion: true } }],
    notes: 'Puerta abatible con jaladera de acero.',
    payments: [{ when: -12, share: 0.5, type: 'anticipo', method: 'efectivo', notes: 'Anticipo en efectivo.' }],
    events: [{ title: 'Instalación puerta abatible · Carlos Cantú', type: 'instalacion', start: { day: -2, hour: 11 }, hours: 2, status: 'completado', assignee: 'instalacion', notes: 'Cliente paga el saldo la próxima semana.' }],
    photos: [{ file: 'cantu-despues.png', kind: 'after', caption: 'Puerta abatible 10 mm terminada', isPublic: true }],
  },
  {
    key: 'fuerza', client: 'fuerza', story: 'Comercio que aceptó y dio anticipo: muro de espejos para el gimnasio, instalación mañana.',
    created: { day: -6, hour: 13 }, status: 'accepted', sent: -6, viewed: -5, accepted: -3,
    lines: [{ service: 'Espejo a la medida', input: { ancho: 2400, alto: 1800, piezas: 4, espesor: '6', canto: 'pulido', instalacion: true } }],
    notes: 'Espejos con fijación oculta y cinta de seguridad.',
    payments: [{ when: -3, share: 0.5, type: 'anticipo', method: 'efectivo', notes: 'Anticipo en efectivo en el gimnasio.' }],
    events: [{ title: 'Instalación muro de espejos · Gimnasio Fuerza Regia', type: 'instalacion', start: { day: 1, hour: 8 }, hours: 4, status: 'pendiente', assignee: 'instalacion', notes: 'Temprano, antes de la hora pico del gimnasio. Llevar ventosas.' }],
    photos: [{ file: 'gimnasio-espejos.png', kind: 'other', caption: 'Referencia acordada con el cliente', isPublic: false }],
  },
  {
    key: 'laura', client: 'laura', story: 'Cotización enviada y vista por la clienta, sin respuesta todavía: hay recordatorio de seguimiento.',
    created: { day: -4, hour: 18 }, status: 'viewed', sent: -4, viewed: -3,
    lines: [{ service: 'Ventana de aluminio', input: { ancho: 1500, alto: 1200, piezas: 3, linea: 'serie-2', acabado: 'blanco', mosquitero: true, instalacion: true } }],
    notes: 'Ventanas de recámaras con mosquitero.',
  },
  {
    key: 'contry', client: 'contry', story: 'Cotización recién enviada a una clínica: vidrio esmerilado para dar privacidad a los consultorios.',
    created: { day: -1, hour: 10 }, status: 'sent', sent: -1,
    lines: [{ service: 'Vidrio a la medida', input: { ancho: 1000, alto: 2000, piezas: 4, tipo: 'esmerilado', espesor: '6', pulido: true, instalacion: true } }],
    notes: 'Instalación en horario sin pacientes (sábado).',
  },
  {
    key: 'trevino', client: 'trevino', story: 'Cotización rechazada: el cliente eligió otra opción por precio. Queda el registro para analizar por qué se pierden ventas.',
    created: { day: -9, hour: 15 }, status: 'rejected', sent: -9, viewed: -8, rejected: -5,
    lines: [{ service: 'Ventana de aluminio', input: { ancho: 1200, alto: 1000, piezas: 2, linea: 'serie-3', acabado: 'natural', mosquitero: false, instalacion: true } }],
    notes: 'Rechazada: el cliente consiguió precio más bajo en serie 2 sin instalación.',
  },
  {
    key: 'torres', client: 'torres', story: 'Borrador grande pendiente de medidas finales: 20 ventanas para el condominio; la medición está agendada.',
    created: { day: 0, hour: 9 }, status: 'draft',
    lines: [{ service: 'Ventana de aluminio', input: { ancho: 1200, alto: 1000, piezas: 20, linea: 'serie-3', acabado: 'blanco', mosquitero: false, instalacion: true } }],
    notes: 'Borrador con medidas tipo. Confirmar vanos en la medición.',
    events: [{ title: 'Medición de 20 ventanas · Condominio Torres del Lago', type: 'medicion', start: { day: 3, hour: 10 }, hours: 3, status: 'pendiente', assignee: 'ventas', notes: 'Pedir acceso a la administración; llevar formato de medidas.' }],
  },
]

export const REMINDERS: readonly CaseReminder[] = [
  { title: 'Cobrar saldo de la puerta abatible · Carlos Cantú', description: 'Quedó pendiente el 50 %. Mandar recordatorio por WhatsApp.', type: 'follow_up', day: 0, priority: 'high', quote: 'cantu' },
  { title: 'Dar seguimiento a Laura Méndez', description: 'Vio la cotización hace 3 días; preguntar si tiene dudas sobre los mosquiteros.', type: 'follow_up', day: 1, priority: 'normal', quote: 'laura' },
  { title: 'Confirmar con Clínica Dental Contry', description: 'Llamar el jueves para agendar visita de sábado.', type: 'follow_up', day: 3, priority: 'normal', quote: 'contry' },
  { title: 'Segundo pago del Despacho Salinas', description: 'Solicitar 25 % al terminar la etapa 2.', type: 'custom', day: 3, priority: 'high', quote: 'salinas' },
  { title: 'Mantenimiento de herrajes · Andrea Garza', description: 'Ajuste y limpieza de rodamientos del cancel.', type: 'maintenance', day: 170, priority: 'low', quote: 'andrea', recurringMonths: 6 },
]

export const REQUESTS: readonly CaseRequest[] = [
  { name: 'Andrea Garza Villarreal', phone: '8155501001', email: 'andrea.garza@example.com', message: 'Hola, quiero cambiar la cortina de mi regadera por un cancel de vidrio y poner un espejo sobre el lavabo.', details: { medidas: '1.50 x 1.90 m', piezas: '1' }, when: { day: -18, hour: 9 }, status: 'converted', convertedTo: 'andrea' },
  { name: 'Paola Ríos', phone: '8155501011', email: 'paola.rios@example.com', message: 'Necesito precio de un cancel de baño corredizo, mi regadera mide más o menos 1.40 de ancho.', details: { medidas: '1.40 x 1.90 m', piezas: '1' }, when: { day: 0, hour: 8 }, status: 'new' },
  { name: 'Jorge Elizalde', phone: '8155501012', message: 'Cotización de 4 ventanas de aluminio negro para la fachada de mi casa en Cumbres.', details: { medidas: '1.20 x 1.50 m', piezas: '4' }, when: { day: -1, hour: 21 }, status: 'new' },
  { name: 'Venta de refacciones', phone: '8155501013', message: 'Ofrecemos refacciones automotrices a precio de mayoreo, contáctenos.', details: {}, when: { day: -2, hour: 14 }, status: 'discarded' },
]
