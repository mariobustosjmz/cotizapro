import type { TradeKey } from '@cotizapro/quoting'

export type AccountType = 'person' | 'group' | 'company'
export type SeedRole = 'owner' | 'admin' | 'member'

export interface SeedUser {
  readonly email: string
  readonly fullName: string
  readonly role: SeedRole
}

export interface SeedAccount {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly accountType: AccountType
  readonly trade: TradeKey
  readonly quoteCount: number
  readonly seed: number
  readonly users: readonly SeedUser[]
  /** Logo de ejemplo (scripts/seed/data/logos/<logo>.png) y color de marca #RRGGBB. */
  readonly brand: { readonly logo: string; readonly color: string }
  readonly profile: {
    readonly displayName: string
    readonly headline: string
    readonly bio: string
    readonly serviceArea: string
    readonly city: string
    readonly whatsapp: string
  }
}

/** Cuentas demo. Prefijo fijo de UUID 00000000-0000-0000-00c0-* para que el seed sea idempotente. */
export const SEED_ACCOUNTS: readonly SeedAccount[] = [
  {
    id: '00000000-0000-0000-00c0-000000000001',
    name: 'MEGAGLASS Demo',
    slug: 'megaglass-demo',
    accountType: 'company',
    trade: 'glass',
    quoteCount: 40,
    seed: 101,
    users: [
      { email: 'direccion@megaglass.demo.cotizapro.mx', fullName: 'Dirección MEGAGLASS', role: 'owner' },
      { email: 'ventas@megaglass.demo.cotizapro.mx', fullName: 'Karla Ventas', role: 'admin' },
      { email: 'instalador@megaglass.demo.cotizapro.mx', fullName: 'Ramiro Instalador', role: 'member' },
    ],
    brand: { logo: 'megaglass', color: '#0E7490' },
    profile: {
      displayName: 'MEGAGLASS',
      headline: 'Vidrio, aluminio y cancelería a la medida en Monterrey',
      bio: 'Taller de vidrio templado, canceles de baño, ventanas de aluminio y espejos. Medimos sin costo en el área metropolitana y entregamos con instalación garantizada.',
      serviceArea: 'Monterrey, San Pedro, Guadalupe, San Nicolás, Apodaca y Santa Catarina',
      city: 'Monterrey, N.L.',
      whatsapp: '528112345678',
    },
  },
  {
    id: '00000000-0000-0000-00c0-000000000002',
    name: 'Cuadrilla Voltaje',
    slug: 'cuadrilla-voltaje',
    accountType: 'group',
    trade: 'electrical',
    quoteCount: 15,
    seed: 202,
    users: [
      { email: 'hector@voltaje.demo.cotizapro.mx', fullName: 'Héctor Garza', role: 'owner' },
      { email: 'luis@voltaje.demo.cotizapro.mx', fullName: 'Luis Treviño', role: 'member' },
    ],
    brand: { logo: 'voltaje', color: '#F59E0B' },
    profile: {
      displayName: 'Cuadrilla Voltaje',
      headline: 'Electricistas para casa y negocio',
      bio: 'Somos tres electricistas con más de 10 años de experiencia. Instalaciones nuevas, centros de carga, cableado y luminarias con garantía por escrito.',
      serviceArea: 'Guadalupe, Juárez, Monterrey centro y Apodaca',
      city: 'Guadalupe, N.L.',
      whatsapp: '528123456789',
    },
  },
  {
    id: '00000000-0000-0000-00c0-000000000003',
    name: 'Plomería Don Beto',
    slug: 'plomeria-don-beto',
    accountType: 'person',
    trade: 'plumbing',
    quoteCount: 12,
    seed: 303,
    users: [{ email: 'beto@plomeria.demo.cotizapro.mx', fullName: 'Alberto Cantú', role: 'owner' }],
    brand: { logo: 'don-beto', color: '#0369A1' },
    profile: {
      displayName: 'Don Beto Plomero',
      headline: 'Plomería honesta, a tiempo y limpia',
      bio: 'Destapes, fugas, calentadores y tubería. 25 años en el oficio. Llego en el horario acordado y le dejo su baño limpio.',
      serviceArea: 'San Nicolás, Escobedo y Apodaca',
      city: 'San Nicolás de los Garza, N.L.',
      whatsapp: '528134567890',
    },
  },
  {
    id: '00000000-0000-0000-00c0-000000000004',
    name: 'Costuras Lupita',
    slug: 'costuras-lupita',
    accountType: 'person',
    trade: 'sewing',
    quoteCount: 12,
    seed: 404,
    users: [{ email: 'lupita@costuras.demo.cotizapro.mx', fullName: 'Guadalupe Salinas', role: 'owner' }],
    brand: { logo: 'lupita', color: '#BE185D' },
    profile: {
      displayName: 'Costuras Lupita',
      headline: 'Arreglos de ropa, cortinas y uniformes',
      bio: 'Taller de costura familiar. Dobladillos el mismo día, cortinas a la medida y uniformes bordados para negocios.',
      serviceArea: 'Santa Catarina y García',
      city: 'Santa Catarina, N.L.',
      whatsapp: '528145678901',
    },
  },
]

/** Org existente sembrada por migraciones (ClimaSol HVAC); solo se le agrega vitrina y giro. */
export const CLIMASOL_ORG_ID = '00000000-0000-0000-0000-000000000002'
