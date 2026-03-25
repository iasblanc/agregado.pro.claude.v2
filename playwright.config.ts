import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Config — Agregado.Pro
 *
 * Cobre:
 * - Desktop (Chrome, Firefox)
 * - Mobile (iPhone 12 — foco no caminhoneiro)
 *
 * Para rodar: pnpm test:e2e
 * Para rodar apenas um arquivo: pnpm test:e2e dre-flow
 * Para UI mode: pnpm playwright test --ui
 */
export default defineConfig({
  testDir:    './__tests__/e2e',
  outputDir:  './playwright-report',
  timeout:    30_000,
  retries:    process.env.CI ? 2 : 0,
  workers:    process.env.CI ? 1 : undefined,
  fullyParallel: true,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL:            process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace:              'on-first-retry',
    screenshot:         'only-on-failure',
    video:              'retain-on-failure',
    locale:             'pt-BR',
    timezoneId:         'America/Sao_Paulo',
    // Aceitar headers de auth nos cookies
    extraHTTPHeaders: {
      'x-test-env': 'e2e',
    },
  },

  projects: [
    // Desktop — Chrome (principal)
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },

    // Mobile — iPhone 12 (foco do produto: caminhoneiro usa smartphone)
    {
      name: 'mobile-safari',
      use:  { ...devices['iPhone 12'] },
    },

    // Firefox — compatibilidade
    {
      name: 'firefox',
      use:  { ...devices['Desktop Firefox'] },
    },
  ],

  // Subir o servidor Next.js antes dos testes (apenas em dev)
  webServer: process.env.CI
    ? undefined
    : {
        command:             'pnpm dev',
        url:                 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout:             120_000,
      },
})
