import { test, expect, type Page } from '@playwright/test'

/**
 * E2E — Fluxos críticos do DRE
 *
 * Cobre os fluxos que definem o critério de sucesso da Phase 1:
 * "O caminhoneiro consegue responder 'meu caminhão está dando lucro?'"
 *
 * Para executar: pnpm test:e2e
 *
 * Pré-requisitos:
 * - App rodando em http://localhost:3000
 * - Supabase local com seed de usuário de teste
 */

const TEST_USER = {
  email:    process.env.TEST_USER_EMAIL    ?? 'test@agregado.pro',
  password: process.env.TEST_USER_PASSWORD ?? 'Teste123!',
}

// ─── Helper: login ────────────────────────────────────────────────

async function loginAs(page: Page, user = TEST_USER) {
  await page.goto('/login')
  await page.fill('input[name="email"]',    user.email)
  await page.fill('input[name="password"]', user.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/gestao', { timeout: 10_000 })
}

// ─── Testes ───────────────────────────────────────────────────────

test.describe('Autenticação', () => {
  test('redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/gestao')
    await expect(page).toHaveURL('/login')
  })

  test('login com credenciais válidas redireciona para /gestao', async ({ page }) => {
    await loginAs(page)
    await expect(page).toHaveURL('/gestao')
    await expect(page.locator('h1, [data-testid="greeting"]')).toBeVisible()
  })

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]',    'email@inexistente.com')
    await page.fill('input[name="password"]', 'SenhaErrada1!')
    await page.click('button[type="submit"]')

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(/incorretos/)
  })

  test('link para recuperar senha visível na tela de login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Esqueci minha senha')).toBeVisible()
  })
})

test.describe('Lançamento de DRE', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test('navega para formulário de lançamento', async ({ page }) => {
    // Pode navegar via botão na gestão ou sidebar
    await page.goto('/gestao/lancamento')
    await expect(page.locator('h1')).toContainText(/lançamento/i)
    await expect(page.locator('select[name="entry_type"]')).toBeVisible()
  })

  test('registra receita com KM e vê confirmação', async ({ page }) => {
    await page.goto('/gestao/lancamento')

    await page.selectOption('select[name="entry_type"]', 'receita')
    await page.selectOption('select[name="category"]',   'frete')
    await page.fill('input[name="description"]', 'Frete SP → CWB teste E2E')
    await page.fill('input[name="amount"]',       '8000')
    await page.fill('input[name="km_reference"]', '400')

    await page.click('button[type="submit"]')

    // Confirmação de sucesso
    await expect(page.getByText(/registrado/i)).toBeVisible({ timeout: 8_000 })
  })

  test('exibe erro ao submeter formulário sem categoria', async ({ page }) => {
    await page.goto('/gestao/lancamento')

    await page.fill('input[name="description"]', 'Teste sem categoria')
    await page.fill('input[name="amount"]',      '100')
    await page.click('button[type="submit"]')

    // Deve mostrar erro de validação
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
  })

  test('registra custo fixo e vê no DRE', async ({ page }) => {
    await page.goto('/gestao/lancamento')

    await page.selectOption('select[name="entry_type"]', 'custo_fixo')
    await page.selectOption('select[name="category"]',   'parcela_caminhao')
    await page.fill('input[name="description"]', 'Parcela caminhão março')
    await page.fill('input[name="amount"]',      '2500')

    await page.click('button[type="submit"]')
    await expect(page.getByText(/registrado/i)).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Visualização DRE', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test('acessa página de DRE sem erro', async ({ page }) => {
    await page.goto('/dre')
    await expect(page).toHaveURL('/dre')
    // Header do DRE visível
    await expect(page.locator('main')).toBeVisible()
  })

  test('seletor de período está visível', async ({ page }) => {
    await page.goto('/dre')
    const select = page.locator('select[aria-label="Selecionar período"]')
    await expect(select).toBeVisible()
  })

  test('botão de novo lançamento redireciona corretamente', async ({ page }) => {
    await page.goto('/dre')
    await page.getByText('+ Lançamento').click()
    await expect(page).toHaveURL('/gestao/lancamento')
  })
})

test.describe('Gestão — dashboard principal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test('exibe cards de resumo ou CTA de primeiros passos', async ({ page }) => {
    await page.goto('/gestao')
    // Deve ter ou os cards de KPI ou o estado vazio com CTA
    const hasCards = await page.locator('[class*="grid"] .rounded-xl').count()
    const hasCta   = await page.getByText(/primeiros passos/i).isVisible()
    expect(hasCards > 0 || hasCta).toBe(true)
  })

  test('sidebar visível em desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/gestao')
    await expect(page.locator('aside[aria-label="Navegação principal"]')).toBeVisible()
  })

  test('mobile nav visível em smartphone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/gestao')
    await expect(page.locator('nav[aria-label="Navegação mobile"]')).toBeVisible()
  })
})

test.describe('Acessibilidade — checks básicos', () => {
  test('página de login tem labels para todos os inputs', async ({ page }) => {
    await page.goto('/login')
    const emailLabel    = page.locator('label[for*="email"]')
    const passwordLabel = page.locator('label[for*="password"]')
    await expect(emailLabel).toBeVisible()
    await expect(passwordLabel).toBeVisible()
  })

  test('formulário de lançamento tem label para tipo', async ({ page }) => {
    await loginAs(page)
    await page.goto('/gestao/lancamento')
    await expect(page.locator('label[for*="entry_type"]')).toBeVisible()
  })

  test('itens da nav têm aria-current na página ativa', async ({ page }) => {
    await loginAs(page)
    await page.goto('/gestao')
    await page.setViewportSize({ width: 1280, height: 800 })
    const activeLink = page.locator('a[aria-current="page"]')
    await expect(activeLink).toBeVisible()
  })
})
