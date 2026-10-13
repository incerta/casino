import { expect, type Page } from '@playwright/test'

import { readVisitorEvents } from './events'

const VISITOR_ID_LOCAL_STORAGE_KEY = 'IncertaCasinoVisitorId'

/** Opens a game and waits until its main action is ready */
export async function openGame(page: Page, gameId: string) {
  await page.goto(`/games/${gameId}`)
  await expect(
    spinButton(page).or(rollButton(page)).or(playButton(page))
  ).toBeEnabled()
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

export function rollButton(page: Page) {
  return page.getByRole('button', { name: 'Roll', exact: true })
}

/** Rolls the dice once and waits until the roll is rendered and the UI is idle */
export async function roll(page: Page) {
  const rounds = await readStat(page, 'Rounds')

  await rollButton(page).click()

  await expect(stat(page, 'Rounds')).toHaveText(String(rounds + 1))
  await expect(rollButton(page)).toBeEnabled()
}

export function playButton(page: Page) {
  return page.getByRole('button', { name: 'Play', exact: true })
}

export function goButton(page: Page) {
  return page.getByRole('button', { name: 'Go', exact: true })
}

export function cashOutButton(page: Page) {
  return page.getByRole('button', { name: /^Cash out \d+$/ })
}

/** Starts a Chicken Cross run and waits until the chicken can move */
export async function startRun(page: Page) {
  await playButton(page).click()
  await expect(goButton(page)).toBeEnabled()
}

export type CrossOutcome = 'crossed' | 'hit' | 'cashed_out'

/**
 * Crosses the next lane. Whether the chicken survives is decided by the
 * server, so the outcome is read back from the stored events.
 */
export async function go(page: Page): Promise<CrossOutcome> {
  const visitorId = await getVisitorId(page)
  const before = (await readVisitorEvents(visitorId)).length

  await goButton(page).click()

  await expect
    .poll(async () => (await readVisitorEvents(visitorId)).length)
    .toBeGreaterThan(before)
  const kinds = (await readVisitorEvents(visitorId))
    .slice(before)
    .map((event) => event.kind)

  if (kinds.includes('road_run_hit')) {
    await expect(playButton(page)).toBeEnabled()
    return 'hit'
  }

  if (kinds.includes('road_run_cashed_out')) {
    await expect(playButton(page)).toBeEnabled()
    return 'cashed_out'
  }

  await expect(goButton(page)).toBeEnabled()
  return 'crossed'
}

/** Cashes out the active run and waits until a new run can start */
export async function cashOut(page: Page) {
  await cashOutButton(page).click()
  await expect(playButton(page)).toBeEnabled()
}

/** Opens the sidebar drawer on mobile; on desktop it's always shown */
export async function openMenu(page: Page) {
  const burger = page.getByRole('button', { name: 'Toggle menu' })

  if ((await burger.getAttribute('aria-expanded')) === 'false') {
    await burger.click()
  }
}
