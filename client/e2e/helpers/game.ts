import { expect, type Page } from '@playwright/test'

const VISITOR_ID_LOCAL_STORAGE_KEY = 'IncertaCasinoVisitorId'

export async function openGame(page: Page, gameId: string) {
  await page.goto(`/games/${gameId}`)
  await expect(spinButton(page)).toBeEnabled()
}

export function spinButton(page: Page) {
  return page.getByRole('button', { name: 'Spin', exact: true })
}

export function bonusDialog(page: Page) {
  return page.getByRole('dialog', { name: "You've won a bonus" })
}

/** Value cell of a stat (`Demo balance`, `Bet`, `Rounds`) */
export function stat(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=following-sibling::dd')
}

export async function readStat(page: Page, label: string) {
  return Number(await stat(page, label).textContent())
}

/** Spins once and waits until the round is rendered and the UI is idle */
export async function spin(page: Page) {
  const rounds = await readStat(page, 'Rounds')

  await spinButton(page).click()

  await expect(stat(page, 'Rounds')).toHaveText(String(rounds + 1))
  await expect(spinButton(page)).toBeEnabled()
}

export async function changeBet(page: Page, bet: number) {
  await page
    .getByRole('group', { name: 'Bet' })
    .getByRole('button', { name: String(bet), exact: true })
    .click()

  await expect(stat(page, 'Bet')).toHaveText(String(bet))
}

export async function getVisitorId(page: Page): Promise<string> {
  const visitorId = await page.evaluate(
    (key) => localStorage.getItem(key),
    VISITOR_ID_LOCAL_STORAGE_KEY
  )

  if (visitorId === null) throw new Error('Visitor id is not initialized')

  return visitorId
}

export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
}
