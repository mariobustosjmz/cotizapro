import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export class DatabaseHelper {
  private supabase: any

  constructor() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  async createTestUser(email: string, password: string, fullName: string) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    })

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`)
    }

    return data.user
  }

  async createOrganization(userId: string, orgName: string, email: string, fullName: string) {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data, error } = await this.supabase.rpc('create_organization_with_owner', {
      org_name: orgName,
      org_slug: slug,
      owner_id: userId,
      owner_email: email,
      owner_full_name: fullName,
    })

    if (error) {
      throw new Error(`Failed to create organization: ${error.message}`)
    }

    return data
  }

  async deleteUser(userId: string) {
    const { error } = await this.supabase.auth.admin.deleteUser(userId)
    if (error) {
      console.warn(`Failed to delete user: ${error.message}`)
    }
  }

  async getOrganizationId(userId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to get organization: ${error.message}`)
    }

    return data.organization_id
  }

  async getClientsByOrganization(organizationId: string) {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`)
    }

    return data
  }

  async createClient(organizationId: string, clientData: any) {
    const { data, error } = await this.supabase
      .from('clients')
      .insert({
        ...clientData,
        organization_id: organizationId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`)
    }

    return data
  }

  async deleteClient(clientId: string) {
    const { error } = await this.supabase.from('clients').delete().eq('id', clientId)

    if (error) {
      throw new Error(`Failed to delete client: ${error.message}`)
    }
  }

  async getQuotesByOrganization(organizationId: string) {
    const { data, error } = await this.supabase
      .from('quotes')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to fetch quotes: ${error.message}`)
    }

    return data
  }

  async createQuote(organizationId: string, quoteData: any) {
    const { data, error } = await this.supabase
      .from('quotes')
      .insert({
        ...quoteData,
        organization_id: organizationId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create quote: ${error.message}`)
    }

    return data
  }

  async getRemindersByOrganization(organizationId: string) {
    const { data, error } = await this.supabase
      .from('reminders')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to fetch reminders: ${error.message}`)
    }

    return data
  }

  async verifyMultiTenantIsolation(userId1: string, userId2: string) {
    const org1 = await this.getOrganizationId(userId1)
    const org2 = await this.getOrganizationId(userId2)

    return org1 !== org2
  }

  async cleanupTestData(organizationId: string) {
    // Delete all data for an organization
    await this.supabase.from('reminders').delete().eq('organization_id', organizationId)
    await this.supabase.from('quote_line_items').delete().eq('organization_id', organizationId)
    await this.supabase.from('quotes').delete().eq('organization_id', organizationId)
    await this.supabase.from('clients').delete().eq('organization_id', organizationId)
  }
}
