import { createClient } from '@supabase/supabase-js'
import { testUsers } from '../fixtures/auth.fixture'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001'

export async function seedTestDatabase() {
  console.log('🌱 Seeding test database...')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // 1. Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert(
        {
          id: TEST_ORG_ID,
          name: 'Test Organization',
          slug: 'test-org',
          subscription_status: 'active',
          plan: 'pro',
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (orgError) {
      throw new Error(`Failed to create test org: ${orgError.message}`)
    }

    console.log(`  ✅ Test organization created: ${org.id}`)

    // 2. Create test users via Supabase Auth
    for (const [role, user] of Object.entries(testUsers)) {
      try {
        // Try to create user
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
              organization_id: TEST_ORG_ID,
              full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            },
          })

        if (authError) {
          // User might already exist - try to get existing user
          if (authError.message.includes('already registered') || authError.code === 'email_exists') {
            const { data: existingUsers } = await supabase.auth.admin.listUsers()
            const existingUser = existingUsers.users.find((u) => u.email === user.email)

            if (existingUser) {
              console.log(`  ℹ️  User ${user.email} already exists, ensuring profile...`)

              // Ensure profile exists for existing user
              await supabase.from('profiles').upsert(
                {
                  id: existingUser.id,
                  organization_id: TEST_ORG_ID,
                  role: role,
                  email: user.email,
                  full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                },
                { onConflict: 'id' }
              )

              console.log(`  ✅ Profile ensured for ${role}: ${user.email}`)
              continue
            }
          }
          throw authError
        }

        // 3. Create profile for new user (retry once on transient upstream errors)
        if (authData?.user) {
          let profileError = null
          for (let attempt = 1; attempt <= 3; attempt++) {
            const result = await supabase.from('profiles').upsert(
              {
                id: authData.user.id,
                organization_id: TEST_ORG_ID,
                role: role,
                email: user.email,
                full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
              },
              { onConflict: 'id' }
            )
            profileError = result.error
            if (!profileError) break
            if (attempt < 3) {
              console.warn(`  ⚠️  Profile upsert attempt ${attempt} failed for ${role}, retrying...`)
              await new Promise(resolve => setTimeout(resolve, 500 * attempt))
            }
          }

          if (profileError) {
            throw new Error(`Failed to create profile for ${role}: ${profileError.message}`)
          }

          console.log(`  ✅ Created ${role}: ${user.email}`)
        }
      } catch (error) {
        console.error(`  ❌ Failed to create ${role}:`, error)
        throw error
      }
    }

    // 4. Ensure storage bucket exists
    await supabase.storage.createBucket('documents', { public: true }).catch(() => {
      // Bucket may already exist — ignore
    })
    console.log('  ✅ Storage bucket "documents" ready')

    // 5. Seed clients
    const clientIds: string[] = []
    const clientsData = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        organization_id: TEST_ORG_ID,
        name: 'Juan Pérez',
        company_name: 'Construcciones Pérez SA',
        email: 'juan@construcciones.mx',
        phone: '5551234567',
        city: 'CDMX',
        state: 'Ciudad de México',
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        organization_id: TEST_ORG_ID,
        name: 'María García',
        company_name: 'Inmobiliaria García',
        email: 'maria@inmobiliaria.mx',
        phone: '5557654321',
        city: 'Monterrey',
        state: 'Nuevo León',
      },
    ]
    for (const client of clientsData) {
      const { error } = await supabase.from('clients').upsert(client, { onConflict: 'id' })
      if (error) throw new Error(`Failed to seed client: ${error.message}`)
      clientIds.push(client.id)
    }
    console.log(`  ✅ Seeded ${clientIds.length} clients`)

    // 5. Seed service catalog
    const serviceIds: string[] = []
    const servicesData = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        organization_id: TEST_ORG_ID,
        name: 'Instalación de minisplit',
        category: 'hvac',
        unit_price: 3500.00,
        unit_type: 'fixed',
        is_active: true,
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        organization_id: TEST_ORG_ID,
        name: 'Mantenimiento preventivo',
        category: 'hvac',
        unit_price: 800.00,
        unit_type: 'per_unit',
        is_active: true,
      },
    ]
    for (const service of servicesData) {
      const { error } = await supabase.from('service_catalog').upsert(service, { onConflict: 'id' })
      if (error) throw new Error(`Failed to seed service: ${error.message}`)
      serviceIds.push(service.id)
    }
    console.log(`  ✅ Seeded ${serviceIds.length} services`)

    // 6. Seed quotes
    const quoteIds: string[] = []
    const quotesData = [
      {
        id: '30000000-0000-0000-0000-000000000001',
        organization_id: TEST_ORG_ID,
        quote_number: 'TEST-001',
        client_id: clientIds[0],
        status: 'accepted',
        valid_until: '2027-12-31',
        subtotal: 3500.00,
        tax_rate: 16.00,
        tax_amount: 560.00,
        discount_amount: 0,
        total: 4060.00,
        notes: 'Cotización de prueba',
        terms_and_conditions: 'Condiciones de pago: 50% anticipo',
      },
      {
        id: '30000000-0000-0000-0000-000000000002',
        organization_id: TEST_ORG_ID,
        quote_number: 'TEST-002',
        client_id: clientIds[1],
        status: 'draft',
        valid_until: '2027-12-31',
        subtotal: 1600.00,
        tax_rate: 16.00,
        tax_amount: 256.00,
        discount_amount: 0,
        total: 1856.00,
      },
    ]
    for (const quote of quotesData) {
      const { error } = await supabase.from('quotes').upsert(quote, { onConflict: 'id' })
      if (error) throw new Error(`Failed to seed quote: ${error.message}`)
      quoteIds.push(quote.id)
    }
    console.log(`  ✅ Seeded ${quoteIds.length} quotes`)

    // 7. Seed quote items
    const quoteItemsData = [
      {
        id: '40000000-0000-0000-0000-000000000001',
        quote_id: quoteIds[0],
        service_id: serviceIds[0],
        description: 'Instalación de minisplit 1 ton',
        quantity: 1,
        unit_price: 3500.00,
        unit_type: 'fixed',
        subtotal: 3500.00,
        sort_order: 0,
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        quote_id: quoteIds[1],
        service_id: serviceIds[1],
        description: 'Mantenimiento preventivo x2',
        quantity: 2,
        unit_price: 800.00,
        unit_type: 'per_unit',
        subtotal: 1600.00,
        sort_order: 0,
      },
    ]
    for (const item of quoteItemsData) {
      const { error } = await supabase.from('quote_items').upsert(item, { onConflict: 'id' })
      if (error) throw new Error(`Failed to seed quote_item: ${error.message}`)
    }
    console.log(`  ✅ Seeded ${quoteItemsData.length} quote items`)

    // 8. Seed quote payments
    const { error: paymentError } = await supabase.from('quote_payments').upsert(
      {
        id: '50000000-0000-0000-0000-000000000001',
        organization_id: TEST_ORG_ID,
        quote_id: quoteIds[0],
        amount: 2000.00,
        payment_type: 'anticipo',
        payment_method: 'transferencia',
        payment_date: '2026-01-15',
        notes: 'Anticipo del 50%',
      },
      { onConflict: 'id' }
    )
    if (paymentError) throw new Error(`Failed to seed payment: ${paymentError.message}`)
    console.log('  ✅ Seeded 1 quote payment')

    // 9. Seed follow-up reminders
    const { error: reminderError } = await supabase.from('follow_up_reminders').upsert(
      {
        id: '60000000-0000-0000-0000-000000000001',
        organization_id: TEST_ORG_ID,
        client_id: clientIds[0],
        title: 'Mantenimiento anual de minisplit',
        reminder_type: 'maintenance',
        scheduled_date: '2027-01-15',
        status: 'pending',
        priority: 'normal',
      },
      { onConflict: 'id' }
    )
    if (reminderError) throw new Error(`Failed to seed reminder: ${reminderError.message}`)
    console.log('  ✅ Seeded 1 reminder')

    // 10. Seed quote templates
    const { error: templateError } = await supabase.from('quote_templates').upsert(
      {
        id: '70000000-0000-0000-0000-000000000001',
        organization_id: TEST_ORG_ID,
        name: 'Template HVAC Estándar',
        description: 'Template para instalaciones de HVAC',
        category: 'hvac',
        default_valid_days: 30,
        is_active: true,
      },
      { onConflict: 'id' }
    )
    if (templateError) throw new Error(`Failed to seed template: ${templateError.message}`)
    console.log('  ✅ Seeded 1 quote template')

    // 11. Seed work events
    const { error: workEventError } = await supabase.from('work_events').upsert(
      {
        id: '80000000-0000-0000-0000-000000000001',
        organization_id: TEST_ORG_ID,
        client_id: clientIds[0],
        quote_id: quoteIds[0],
        title: 'Instalación minisplit',
        event_type: 'instalacion',
        scheduled_start: '2027-02-01T09:00:00+00:00',
        scheduled_end: '2027-02-01T13:00:00+00:00',
        status: 'pendiente',
      },
      { onConflict: 'id' }
    )
    if (workEventError) throw new Error(`Failed to seed work_event: ${workEventError.message}`)
    console.log('  ✅ Seeded 1 work event')

    console.log('✅ Test database seeded successfully')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  }
}

export async function cleanTestDatabase() {
  console.log('🧹 Cleaning test database...')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Get all test users
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const testUserEmails = Object.values(testUsers).map((u) => u.email)

    // Delete test users from auth
    for (const user of existingUsers.users) {
      if (testUserEmails.includes(user.email!)) {
        const { error } = await supabase.auth.admin.deleteUser(user.id)
        if (error) {
          console.warn(`  ⚠️  Failed to delete user ${user.email}:`, error.message)
        } else {
          console.log(`  ✅ Deleted user: ${user.email}`)
        }
      }
    }

    // Wait a moment for deletions to propagate
    await new Promise(resolve => setTimeout(resolve, 100))

    // Delete test organization (cascades to profiles, clients, quotes, etc.)
    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', TEST_ORG_ID)

    if (orgError && !orgError.message.includes('no rows')) {
      console.warn(`  ⚠️  Failed to delete test org: ${orgError.message}`)
    } else {
      console.log(`  ✅ Deleted test organization`)
    }

    console.log('✅ Test database cleaned successfully')
  } catch (error) {
    console.error('❌ Database cleanup failed:', error)
    // Don't throw - cleanup is best-effort
  }
}
