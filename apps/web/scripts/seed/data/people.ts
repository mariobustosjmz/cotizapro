export const FIRST_NAMES = [
  'Mariana', 'José Luis', 'Fernanda', 'Rodrigo', 'Alejandra', 'Eduardo', 'Paola', 'Ricardo', 'Daniela', 'Jorge',
  'Valeria', 'Sergio', 'Gabriela', 'Óscar', 'Lorena', 'Arturo', 'Claudia', 'Raúl', 'Patricia', 'Miguel Ángel',
] as const

export const LAST_NAMES = [
  'Garza', 'Treviño', 'González', 'Cantú', 'Villarreal', 'Elizondo', 'Salinas', 'Martínez', 'Rodríguez', 'Leal',
  'Guajardo', 'Sepúlveda', 'Montemayor', 'Zambrano', 'Benavides', 'Hinojosa', 'De la Garza', 'Quiroga',
] as const

export const NEIGHBORHOODS = [
  { colonia: 'Cumbres 3er Sector', city: 'Monterrey', cp: '64610' },
  { colonia: 'Contry', city: 'Monterrey', cp: '64860' },
  { colonia: 'Mitras Centro', city: 'Monterrey', cp: '64460' },
  { colonia: 'Del Valle', city: 'San Pedro Garza García', cp: '66220' },
  { colonia: 'Valle Oriente', city: 'San Pedro Garza García', cp: '66269' },
  { colonia: 'Linda Vista', city: 'Guadalupe', cp: '67130' },
  { colonia: 'Contry La Silla', city: 'Guadalupe', cp: '67173' },
  { colonia: 'Anáhuac', city: 'San Nicolás de los Garza', cp: '66450' },
  { colonia: 'Cerradas de Anáhuac', city: 'General Escobedo', cp: '66059' },
  { colonia: 'Pueblo Nuevo', city: 'Apodaca', cp: '66646' },
  { colonia: 'La Fama', city: 'Santa Catarina', cp: '66100' },
  { colonia: 'Cumbres de Santa Catarina', city: 'Santa Catarina', cp: '66367' },
] as const

export const STREETS = [
  'Av. Paseo de los Leones', 'Calle Río Nazas', 'Av. Lázaro Cárdenas', 'Calle Hidalgo', 'Av. Revolución', 'Calle Zaragoza',
  'Av. Gonzalitos', 'Calle Morelos', 'Av. Universidad', 'Calle Padre Mier', 'Av. Benito Juárez', 'Calle Aramberri',
] as const

export const COMPANIES = ['Constructora Norte', 'Inmobiliaria Sierra Madre', 'Restaurante La Huasteca', 'Clínica Dental Contry', 'Gimnasio Fuerza Regia', null, null, null] as const

export const REVIEW_COMMENTS = {
  5: [
    'Muy puntuales y dejaron todo limpio. El trabajo quedó perfecto.',
    'Excelente atención desde la cotización hasta la instalación. Los recomiendo.',
    'Me explicaron todo con claridad y respetaron el precio cotizado.',
    'Rápidos, amables y el acabado de primera.',
  ],
  4: ['Buen trabajo, llegaron un poco tarde pero avisaron con tiempo.', 'Todo bien, el precio justo. Volvería a contratar.'],
  3: ['El trabajo quedó bien aunque tardaron un día más de lo prometido.'],
} as const

export const REQUEST_MESSAGES = [
  'Buenas tardes, necesito cotización para un trabajo en mi casa. ¿Pueden venir a medir esta semana?',
  'Hola, vi su página. Me interesa una cotización, ¿cuál es su disponibilidad?',
  'Requiero presupuesto para mi negocio, de preferencia en la mañana.',
  'Necesito el servicio lo antes posible. ¿Me pueden llamar?',
] as const
