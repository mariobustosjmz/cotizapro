import type { SeedAccount } from '../data/accounts'

/**
 * Cuenta de presentación de MEGAGLASS. Prefijo 00d0 (no 00c0) para quedar fuera del reinicio diario
 * de las cuentas demo: lo que el equipo explore y cambie se conserva hasta que se vuelva a correr este seed.
 */
export const PRESENTACION: SeedAccount = {
  id: '00000000-0000-0000-00d0-000000000001',
  name: 'MEGAGLASS',
  slug: 'megaglass-prueba',
  accountType: 'company',
  trade: 'glass',
  quoteCount: 0,
  seed: 2026,
  users: [
    { email: 'direccion@megaglass.prueba.cotizapro.mx', fullName: 'Dirección MEGAGLASS', role: 'owner' },
    { email: 'ventas@megaglass.prueba.cotizapro.mx', fullName: 'Ventas MEGAGLASS', role: 'admin' },
    { email: 'instalacion@megaglass.prueba.cotizapro.mx', fullName: 'Instalación MEGAGLASS', role: 'member' },
  ],
  profile: {
    displayName: 'MEGAGLASS',
    headline: 'Vidrio templado, cancelería y aluminio a la medida en Monterrey',
    bio: 'Fabricamos e instalamos canceles de baño, ventanas de aluminio, espejos y vidrio templado para casas, oficinas y comercios. Medimos sin costo en el área metropolitana y entregamos con garantía por escrito.',
    serviceArea: 'Monterrey, San Pedro, Guadalupe, San Nicolás, Apodaca, Santa Catarina y Escobedo',
    city: 'Monterrey, N.L.',
    whatsapp: '528155500000',
  },
}

export const COMPANY_SETTINGS = {
  company_phone: '81 5550 0000',
  company_email: 'ventas@megaglass.prueba.cotizapro.mx',
  company_address: 'Av. Ruiz Cortines 1200, Col. Moderna, Monterrey, N.L.',
  quote_valid_days: 15,
  tax_rate: 16,
  quote_terms: 'Anticipo del 50 % para programar fabricación; saldo contra entrega. Garantía de 1 año en herrajes y 6 meses en mano de obra. Medidas finales se confirman en sitio.',
} as const

export const ROLE_INDEX = { owner: 0, ventas: 1, instalacion: 2 } as const
export type RoleKey = keyof typeof ROLE_INDEX
