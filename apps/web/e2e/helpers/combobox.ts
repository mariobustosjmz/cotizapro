import type { Locator, Page } from '@playwright/test'

/** Contenedor de un Combobox del proyecto (input hidden con `name` + input de texto + lista). */
export function combobox(page: Page, name: string): { container: Locator; input: Locator; options: Locator } {
  const container = page.locator(`div.relative:has(> input[type="hidden"][name="${name}"])`).first()
  return { container, input: container.locator('input[type="text"]'), options: container.locator('ul li') }
}

/** Abre el Combobox y espera a que tenga al menos una opción cargada. */
export async function waitForComboboxOptions(page: Page, name: string, timeout = 30_000): Promise<number> {
  const { input, options } = combobox(page, name)
  await input.click()
  await options.first().waitFor({ state: 'visible', timeout })
  const count = await options.count()
  await input.press('Escape')
  await input.blur()
  return count
}

/** Elige una opción por texto parcial, o la primera si no se indica. */
export async function chooseComboboxOption(page: Page, name: string, text?: string): Promise<void> {
  const { input, options } = combobox(page, name)
  await input.click()
  if (text) await input.fill(text)
  const option = text ? options.filter({ hasText: text }).first() : options.first()
  await option.waitFor({ state: 'visible', timeout: 15_000 })
  await option.dispatchEvent('mousedown')
}
