import { expect, test } from '@playwright/test'

const validResponse = {
  certificate: {
    id: 'valid-certificate-id',
    kwh: 42,
    issued_at: '2025-01-01T00:00:00.000Z',
    retired: false,
    retired_at: null,
    retired_by: null,
  },
  on_chain: {
    anchor_tx: 'anchor_tx_123',
    anchor_explorer: 'https://stellar.explorer/tx/anchor_tx_123',
    mint_tx: 'mint_tx_123',
    mint_explorer: 'https://stellar.explorer/tx/mint_tx_123',
  },
  meter_proof: {
    meter_id: 'meter-123',
    reading_hash: 'abcdef1234567890',
    signature_hex: 'deadbeefdeadbeefdeadbeefdeadbeef',
    kwh: 42,
    timestamp: '2025-01-01T00:00:00.000Z',
    verified: true,
  },
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/verify**', async (route) => {
    const url = route.request().url()
    const parsedUrl = new URL(url)
    const queryId = parsedUrl.searchParams.get('id')

    if (queryId === 'valid-certificate-id') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(validResponse),
      })
      return
    }

    if (queryId === 'invalid-certificate-id') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Certificate not found' }),
      })
      return
    }

    await route.continue()
  })
})

test('submits a valid certificate ID and shows verified proof steps', async ({ page }) => {
  await page.goto('/verify')
  await page.fill('#verify-query', 'valid-certificate-id')
  await Promise.all([
    page.waitForResponse('**/api/verify**'),
    page.click('button:has-text("Verify")'),
  ])
  await expect(page.locator('text=Certificate verified successfully.')).toBeVisible()
  await expect(page.locator('text=Certificate verified — full chain of custody confirmed')).toBeVisible()
  await expect(page.locator('text=On-chain proof')).toBeVisible()
  await expect(page.locator('text=Ed25519 verified')).toBeVisible()
})

test('submits an invalid certificate ID and shows an error state', async ({ page }) => {
  await page.goto('/verify')
  await page.fill('#verify-query', 'invalid-certificate-id')
  await Promise.all([
    page.waitForResponse('**/api/verify**'),
    page.click('button:has-text("Verify")'),
  ])
  await expect(page.locator('div[role="alert"]', { hasText: 'Certificate not found' })).toBeVisible()
})
