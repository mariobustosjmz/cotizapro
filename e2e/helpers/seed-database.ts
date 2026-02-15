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
          if (authError.message.includes('already registered')) {
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

        // 3. Create profile for new user
        if (authData?.user) {
          const { error: profileError } = await supabase.from('profiles').upsert(
            {
              id: authData.user.id,
              organization_id: TEST_ORG_ID,
              role: role,
              email: user.email,
              full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            },
            { onConflict: 'id' }
          )

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
        await supabase.auth.admin.deleteUser(user.id)
        console.log(`  ✅ Deleted user: ${user.email}`)
      }
    }

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
