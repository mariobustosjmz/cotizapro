import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas contra producción. Sin servidor local ni siembra de BD.
 * - prod-public: anónimas (vitrinas, solicitudes, seguridad, rendimiento).
 * - prod-auth: con sesión en cuentas demo; se ejecutan con scripts/e2e-prod.sh, que lee
 *   la contraseña demo del servidor sin imprimirla.
 */
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://cotizapro.mariobustos.io'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 120000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/prod', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'prod-public', testMatch: 'prod/**/*.spec.ts', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'prod-auth',
      testMatch: ['specs/21-configurable-product.spec.ts', 'specs/22-public-profile.spec.ts', 'specs/23-review-flow.spec.ts', 'specs/24-quote-request.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
