/**
 * Datos del escenario: un taller de vidrio y aluminio de Monterrey en su primera semana en CotizaPro.
 * Correos de clientes en el dominio reservado .test: nunca se entregan aunque haya proveedor de correo.
 */
import type { ClientData, CompanyData, PublicRequest, ShowcaseData, SimpleService, TemplateData } from './ui-setup'

export const OWNER_NAME = 'Sofía Treviño'

export const COMPANY: CompanyData = {
  email: 'contacto@cristaleriadelvalle.test',
  phone: '81 8340 1200',
  address: 'Av. Ruiz Cortines 1450, Col. Del Valle Oriente, Monterrey, N.L.',
  validDays: '15',
  terms: 'Precios en MXN con IVA. Anticipo de 50 % para fabricar y saldo al terminar la instalación. Garantía de 1 año en herrajes y 6 meses en instalación.',
}

export const SHOWCASE: ShowcaseData = {
  headline: 'Canceles de baño, ventanas de aluminio y espejos a la medida en Monterrey',
  bio: 'Taller con 15 años de experiencia. Medimos sin costo, fabricamos en 5 a 10 días hábiles e instalamos con garantía por escrito.',
  city: 'Monterrey, N.L.',
  area: 'Monterrey, San Pedro, Guadalupe y Santa Catarina',
  whatsapp: '81 8340 1200',
  email: 'contacto@cristaleriadelvalle.test',
}

export const SERVICES: readonly SimpleService[] = [
  { name: 'Película de seguridad', unit: 'Por m²', price: '420', description: 'Película antiastillante de 4 mil, instalada.' },
  { name: 'Mano de obra adicional', unit: 'Por Hora', price: '280', description: 'Hora de instalador para trabajos fuera de catálogo.' },
  { name: 'Mosquitero corredizo', unit: 'Por Unidad', price: '650', description: 'Mosquitero de aluminio con malla de fibra de vidrio.' },
]

export function bathTemplate(promoUntil: string): TemplateData {
  return {
    name: 'Paquete Baño Completo',
    description: 'Cancel templado 9 mm corredizo y espejo biselado, instalados.',
    terms: 'Anticipo de 50 %. Garantía de 1 año en herrajes.',
    discount: '5',
    promo: 'Promo Otoño',
    promoUntil,
    items: [
      { description: 'Cancel de baño templado 9 mm corredizo, hasta 1.50 × 1.90 m, instalado', qty: '1', price: '8900', unit: 'fixed' },
      { description: 'Espejo biselado 0.80 × 0.60 m, instalado', qty: '1', price: '1450', unit: 'fixed' },
    ],
  }
}

export const LAURA: ClientData = {
  name: 'Laura Méndez',
  email: 'laura.mendez@correo.test',
  phone: '81 1122 3344',
  address: 'Calle Río Nazas 214, Col. Del Valle, San Pedro Garza García',
  tags: 'residencial',
  notes: 'Dos vidrios rotos (cocina y baño). Prefiere pagar en efectivo.',
}

export const SALINAS: ClientData = {
  name: 'Héctor Salinas',
  company: 'Despacho Salinas Arquitectos',
  email: 'hector@salinas-arq.test',
  phone: '81 8000 4500',
  address: 'Av. Lázaro Cárdenas 2400, piso 7, Valle Oriente, San Pedro',
  tags: 'corporativo, arquitecto',
  notes: 'Remodelación de oficinas: 3 baños, ventanas de fachada y barandal interior. Pagos por transferencia.',
}

export const TORRES: ClientData = {
  name: 'Patricia Ruiz',
  company: 'Condominio Torres del Lago',
  email: 'admin@torresdellago.test',
  phone: '81 8333 1020',
  address: 'Av. del Lago 500, Cumbres, Monterrey',
  tags: 'condominio',
  notes: 'Administradora. Quiere el paquete de baño para el departamento muestra y luego replicarlo.',
}

export const NOGALERA: ClientData = {
  name: 'Mauricio Elizondo',
  company: 'Restaurante La Nogalera',
  email: 'gerencia@lanogalera.test',
  phone: '81 8123 9090',
  address: 'Calzada San Pedro 120, San Pedro Garza García',
  tags: 'comercial',
  notes: 'Película de seguridad en el ventanal del salón.',
}

export const ANDREA: PublicRequest = {
  name: 'Andrea Villarreal',
  phone: '81 2345 6789',
  email: 'andrea.v@correo.test',
  message: 'Necesito un cancel de baño templado para la regadera y un espejo para el lavabo. ¿Pueden venir a medir?',
  measures: 'Regadera 1.50 x 1.90 m; espejo 0.90 x 0.70 m',
}

export const ROBERTO: PublicRequest = {
  name: 'Roberto Cantú',
  phone: '81 5566 7788',
  message: 'Quiero un espejo grande para el gimnasio de mi casa, de pared a pared.',
  measures: 'Pared de 2.40 x 1.80 m',
}

export const MEMBER_EMAIL = 'jorge.instalador@cristaleriadelvalle.test'
