import { COMPANIES, FIRST_NAMES, LAST_NAMES, NEIGHBORHOODS, STREETS } from '../data/people'
import { type Admin, must, type Rand } from '../util'

export interface SeededClient {
  readonly id: string
  readonly name: string
  readonly address: string
}

function phone(rand: Rand): string {
  return `81${rand.int(10_000_000, 99_999_999)}`
}

export async function seedClients(admin: Admin, orgId: string, ownerId: string, rand: Rand, count: number): Promise<readonly SeededClient[]> {
  const rows = Array.from({ length: count }, (_, i) => {
    const first = FIRST_NAMES[(i * 7 + rand.int(0, 3)) % FIRST_NAMES.length]!
    const last = `${rand.pick(LAST_NAMES)} ${rand.pick(LAST_NAMES)}`
    const place = rand.pick(NEIGHBORHOODS)
    const tel = phone(rand)
    const name = `${first} ${last}`
    const address = `${rand.pick(STREETS)} ${rand.int(100, 3999)}, Col. ${place.colonia}`
    return {
      organization_id: orgId,
      name,
      email: `${first.toLowerCase().replace(/[^a-z]/g, '')}.${i}@correo.demo.cotizapro.mx`,
      phone: tel,
      whatsapp_phone: tel,
      address,
      city: place.city,
      state: 'Nuevo León',
      postal_code: place.cp,
      company_name: rand.pick(COMPANIES),
      tags: rand.chance(0.3) ? ['recurrente'] : [],
      created_by: ownerId,
    }
  })
  const data = must(await admin.from('clients').insert(rows).select('id, name, address'), 'insert clients')
  return data.map((c) => ({ id: c.id as string, name: c.name as string, address: (c.address as string) ?? '' }))
}
