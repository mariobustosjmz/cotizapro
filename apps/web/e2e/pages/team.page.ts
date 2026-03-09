import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class TeamPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.page.goto('/dashboard/team', { waitUntil: 'domcontentloaded' })
    // Wait for the page heading so streaming content is fully rendered
    await this.page.locator('h2:has-text("Equipo")').waitFor({ state: 'visible', timeout: 15000 }).catch(() => null)
  }

  async goToInvite() {
    await this.page.goto('/dashboard/team/invite', { waitUntil: 'domcontentloaded' })
  }

  // Team Members List
  async getTeamMembersList(): Promise<string[]> {
    const members = await this.page.locator('table tbody tr td:first-child').allTextContents()
    return members.map(m => m.trim()).filter(m => m)
  }

  async getTotalMembersCount(): Promise<number> {
    const text = await this.getText(this.page.locator('text=Miembros').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10) || 0
  }

  // Invite Member
  async fillInviteForm(data: {
    email: string
    role?: string
  }) {
    const emailInput = this.page.locator('input[name="email"]')
    await emailInput.fill(data.email)

    if (data.role) {
      const roleSelect = this.page.locator('select[name="role"]')
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption(data.role)
      }
    }
  }

  async submitInviteForm() {
    await this.page.locator('button[type="submit"]:has-text("Enviar Invitación"), button[type="submit"]:has-text("Invitar"), button[type="submit"]:has-text("Send")').click()
    await this.page.waitForTimeout(1000)
  }

  async inviteMember(email: string, role?: string) {
    await this.goToInvite()
    await this.fillInviteForm({ email, role })
    await this.submitInviteForm()
  }

  async getInvitationLinkFromForm(): Promise<string> {
    const linkField = this.page.locator('input[readonly][value*="invite"], code')
    return await this.getText(linkField)
  }

  // Update Member Role
  async clickEditMemberButton(email: string) {
    await this.page.locator(`table tbody tr:has-text("${email}") button:has-text("Editar")`).click()
  }

  async selectNewRole(role: string) {
    const roleSelect = this.page.locator('select[name="role"]')
    await roleSelect.selectOption(role)
  }

  async submitRoleChange() {
    await this.page.locator('button[type="submit"]:has-text("Guardar"), button[type="submit"]:has-text("Save")').click()
  }

  async updateMemberRole(email: string, newRole: string) {
    await this.clickEditMemberButton(email)
    await this.selectNewRole(newRole)
    await this.submitRoleChange()
  }

  // Remove Member
  async clickRemoveMemberButton(email: string) {
    await this.page.locator(`table tbody tr:has-text("${email}") button:has-text("Eliminar"), table tbody tr:has-text("${email}") button:has-text("Remove")`).click()
  }

  async confirmRemoveMember() {
    const confirmButton = this.page.locator('button:has-text("Confirmar"), button:has-text("Eliminar")')
    await confirmButton.click()
    await this.page.waitForTimeout(500)
  }

  async removeMember(email: string) {
    await this.clickRemoveMemberButton(email)
    await this.confirmRemoveMember()
  }

  // Invitation Page (Accept/Reject)
  async goToInvitation(token: string) {
    await super.goto(`/invite/${token}`)
  }

  async clickAcceptInvitationButton() {
    await this.page.locator('button:has-text("Aceptar"), button:has-text("Accept")').click()
    await this.page.waitForURL('**/dashboard')
  }

  async clickRejectInvitationButton() {
    await this.page.locator('button:has-text("Rechazar"), button:has-text("Reject")').click()
  }

  async isInvitationPageVisible(): Promise<boolean> {
    return await this.page.locator('text=Invitación').isVisible() || await this.page.locator('h2:has-text("Únete")').isVisible()
  }

  async getInvitationOrganizationName(): Promise<string> {
    const name = this.page.locator('[data-testid="organization-name"], .organization-name')
    return await this.getText(name)
  }

  async getMemberRole(email: string): Promise<string> {
    const role = this.page.locator(`table tbody tr:has-text("${email}") td:nth-child(2)`)
    return await this.getText(role)
  }
}
