import { Page, APIRequestContext } from '@playwright/test'

export class ApiHelper {
  private page: Page
  private baseUrl: string

  constructor(page: Page) {
    this.page = page
    this.baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
  }

  async getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const cookies = document.cookie.split('; ')
      const sessionCookie = cookies.find((c) => c.startsWith('sb-'))
      return sessionCookie ? sessionCookie.split('=')[1] : null
    })
  }

  async getClients() {
    const response = await this.page.request.get('/api/clients')
    if (!response.ok()) {
      throw new Error(`Failed to fetch clients: ${response.status()}`)
    }
    return response.json()
  }

  async createClient(clientData: any) {
    const response = await this.page.request.post('/api/clients', {
      data: clientData,
    })
    if (!response.ok()) {
      throw new Error(`Failed to create client: ${response.status()}`)
    }
    return response.json()
  }

  async updateClient(clientId: string, clientData: any) {
    const response = await this.page.request.patch(`/api/clients/${clientId}`, {
      data: clientData,
    })
    if (!response.ok()) {
      throw new Error(`Failed to update client: ${response.status()}`)
    }
    return response.json()
  }

  async deleteClient(clientId: string) {
    const response = await this.page.request.delete(`/api/clients/${clientId}`)
    return response.ok()
  }

  async getQuotes() {
    const response = await this.page.request.get('/api/quotes')
    if (!response.ok()) {
      throw new Error(`Failed to fetch quotes: ${response.status()}`)
    }
    return response.json()
  }

  async createQuote(quoteData: any) {
    const response = await this.page.request.post('/api/quotes', {
      data: quoteData,
    })
    if (!response.ok()) {
      throw new Error(`Failed to create quote: ${response.status()}`)
    }
    return response.json()
  }

  async getReminders() {
    const response = await this.page.request.get('/api/reminders')
    if (!response.ok()) {
      throw new Error(`Failed to fetch reminders: ${response.status()}`)
    }
    return response.json()
  }

  async createReminder(reminderData: any) {
    const response = await this.page.request.post('/api/reminders', {
      data: reminderData,
    })
    if (!response.ok()) {
      throw new Error(`Failed to create reminder: ${response.status()}`)
    }
    return response.json()
  }

  async verifyAccessDenied(method: string, endpoint: string): Promise<boolean> {
    const response = await (this.page.request as any)[method.toLowerCase()](endpoint)
    return response.status() === 403 || response.status() === 404
  }
}
