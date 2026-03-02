import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export interface EventFormData {
  title: string
  event_type?: string
  client_id?: string
  scheduled_start?: string
  scheduled_end?: string
  address?: string
  notes?: string
}

export class CalendarPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/dashboard/calendar')
    await this.page.waitForTimeout(500)
  }

  async gotoNewEvent() {
    await super.goto('/dashboard/calendar/new')
    await this.page.waitForTimeout(500)
  }

  async isCalendarHeadingVisible(): Promise<boolean> {
    return await this.page.locator('h2:has-text("Agenda")').isVisible()
  }

  async isNewEventPageVisible(): Promise<boolean> {
    const isOnNewEventPage = this.page.url().includes('/calendar/new')
    const hasHeading = await this.page.locator('h2:has-text("Nuevo Evento")').isVisible()
    return isOnNewEventPage && hasHeading
  }

  async clickNewEvent() {
    const button = this.page.locator('a[href="/dashboard/calendar/new"], button:has-text("Nuevo Evento")').first()
    await button.waitFor({ state: 'visible' })
    await button.click()
    await this.page.waitForURL('**/dashboard/calendar/new', { timeout: 10000 })
  }

  async isNewEventButtonVisible(): Promise<boolean> {
    return await this.page.locator('a[href="/dashboard/calendar/new"], button:has-text("Nuevo Evento")').first().isVisible()
  }

  async isCalendarWeekViewVisible(): Promise<boolean> {
    // CalendarWeekView renders as a flex container with border and padding
    const weekView = this.page.locator('div.flex.flex-col.h-full.bg-white.rounded-lg.border.border-gray-200').first()
    return await weekView.isVisible()
  }

  async fillEventForm(data: EventFormData): Promise<void> {
    // Title field (required)
    if (data.title) {
      await this.page.locator('input[name="title"]').fill(data.title)
    }

    // Client field (required)
    if (data.client_id) {
      await this.page.locator('select[name="client_id"]').selectOption(data.client_id)
    }

    // Event type field (required, defaults to 'instalacion')
    if (data.event_type) {
      await this.page.locator('select[name="event_type"]').selectOption(data.event_type)
    }

    // Scheduled start field (required)
    if (data.scheduled_start) {
      await this.page.locator('input[name="scheduled_start"]').fill(data.scheduled_start)
    }

    // Scheduled end field (required)
    if (data.scheduled_end) {
      await this.page.locator('input[name="scheduled_end"]').fill(data.scheduled_end)
    }

    // Address field (optional)
    if (data.address) {
      await this.page.locator('input[name="address"]').fill(data.address)
    }

    // Notes field (optional)
    if (data.notes) {
      await this.page.locator('textarea[name="notes"]').fill(data.notes)
    }
  }

  async submitEventForm(): Promise<void> {
    const submitButton = this.page.locator('button[type="submit"]:has-text("Crear evento")')
    await submitButton.click()
    await this.page.waitForURL('**/dashboard/calendar', { timeout: 30000 })
  }

  async getEventCount(): Promise<number> {
    // Events are rendered as absolutely positioned divs within the calendar grid
    // They have specific styling applied via Tailwind (absolute positioning)
    // Use a selector that finds elements with both absolute positioning and padding
    const eventElements = await this.page.locator('div[style*="top:"], div[style*="height:"]').count()
    return eventElements
  }

  async isEventVisible(eventTitle: string): Promise<boolean> {
    return await this.page.locator(`div:has-text("${eventTitle}")`).first().isVisible()
  }

  async getCalendarWeekRangeText(): Promise<string> {
    // Week header shows "dd de month - dd de month, year"
    const header = this.page.locator('div.flex.items-center.justify-between.px-6.py-4 h2')
    return await this.getText(header)
  }
}
