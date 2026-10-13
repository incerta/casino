import { expect, test } from '@playwright/test'

import { readVisitorEventKinds, readVisitorEvents } from '../helpers/events'
import {
  bonusDialog,
  changeBet,
  expectNoHorizontalScroll,
  getVisitorId,
  openGame,
  readStat,
  spin,
  spinButton,
  stat,
} from '../helpers/game'

const DEMO_STARTING_BALANCE = 1000

test.describe('Game', () => {
  test('starts a fresh demo session and records game_opened', async ({
    page,
  }) => {
    await openGame(page, 'lucky-sevens')

    await expect(stat(page, 'Demo balance')).toHaveText(
      String(DEMO_STARTING_BALANCE)
    )
    await expect(stat(page, 'Bet')).toHaveText('10')
    await expect(stat(page, 'Rounds')).toHaveText('0')
    await expect(
      page.getByText('Press Spin to play a demo round')
    ).toBeVisible()
    await expect(
      page.getByText('Credits have no monetary value', { exact: false })
    ).toBeVisible()

    const visitorId = await getVisitorId(page)
    await expect
      .poll(() => readVisitorEventKinds(visitorId))
      .toEqual(['game_opened'])

    await expectNoHorizontalScroll(page)
  })

  test('changes the bet through a bet_changed event', async ({ page }) => {
    await openGame(page, 'fruit-frenzy')

    await changeBet(page, 25)

    const events = await readVisitorEvents(await getVisitorId(page))
    expect(events.at(-1)).toMatchObject({
      kind: 'bet_changed',
      gameId: 'fruit-frenzy',
      bet: 25,
    })
  })

  test('plays a server-decided, simulated round', async ({ page }) => {
    await openGame(page, 'lucky-sevens')
    await changeBet(page, 20)

    await spin(page)

    const events = await readVisitorEvents(await getVisitorId(page))
    const round = events.find((event) => event.kind === 'round_played')

    expect(round).toMatchObject({
      gameId: 'lucky-sevens',
      bet: 20,
      simulated: true,
      balanceAfter: DEMO_STARTING_BALANCE - 20 + Number(round?.win),
    })
    expect(round?.reels).toHaveLength(3)

    // The UI renders exactly what the server decided
    await expect(stat(page, 'Demo balance')).toHaveText(
      String(round?.balanceAfter)
    )
    await expect(
      page.getByText(
        Number(round?.win) > 0
          ? `You won ${round?.win} demo credits (simulated)`
          : 'No win this time'
      )
    ).toBeVisible()
  })

  test('offers the simulated bonus only after two completed rounds', async ({
    page,
  }) => {
    await openGame(page, 'lucky-sevens')

    await spin(page)
    await expect(bonusDialog(page)).toBeHidden()

    await spin(page)
    const dialog = bonusDialog(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Simulated · test environment')).toBeVisible()
    await expect(dialog.getByText('no real-money value')).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Claim Bonus' })
    ).toBeVisible()

    expect(await readVisitorEventKinds(await getVisitorId(page))).toEqual([
      'game_opened',
      'round_played',
      'round_played',
      'bonus_offered',
    ])
  })

  test('keeps an unclaimed bonus offer across reloads', async ({ page }) => {
    await openGame(page, 'fruit-frenzy')
    await spin(page)
    await spin(page)
    await expect(bonusDialog(page)).toBeVisible()

    await page.reload()

    await expect(bonusDialog(page)).toBeVisible()
    await expect(stat(page, 'Rounds')).toHaveText('2')
  })

  test('claims the bonus once and remembers it', async ({ page }) => {
    await openGame(page, 'lucky-sevens')
    await spin(page)
    await spin(page)

    await bonusDialog(page).getByRole('button', { name: 'Claim Bonus' }).click()

    await expect(bonusDialog(page)).toBeHidden()
    await expect(page.getByText('Simulated bonus claimed')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Simulated bonus claimed')).toBeVisible()
    await expect(bonusDialog(page)).toBeHidden()

    await spin(page)
    await expect(bonusDialog(page)).toBeHidden()

    const kinds = await readVisitorEventKinds(await getVisitorId(page))
    expect(kinds.filter((kind) => kind === 'bonus_offered')).toHaveLength(1)
    expect(kinds.filter((kind) => kind === 'bonus_claimed')).toHaveLength(1)
  })

  test('keeps the session across reloads', async ({ page }) => {
    await openGame(page, 'fruit-frenzy')
    await changeBet(page, 50)
    await spin(page)
    const balance = await readStat(page, 'Demo balance')

    await page.reload()

    await expect(stat(page, 'Demo balance')).toHaveText(String(balance))
    await expect(stat(page, 'Bet')).toHaveText('50')
    await expect(stat(page, 'Rounds')).toHaveText('1')
  })

  test('keeps sessions separate per game and per visitor', async ({
    page,
    browser,
  }) => {
    await openGame(page, 'lucky-sevens')
    await spin(page)

    await openGame(page, 'fruit-frenzy')
    await expect(stat(page, 'Rounds')).toHaveText('0')

    const otherVisitor = await browser.newPage()
    await openGame(otherVisitor, 'lucky-sevens')
    await expect(stat(otherVisitor, 'Rounds')).toHaveText('0')
    await expect(stat(otherVisitor, 'Demo balance')).toHaveText(
      String(DEMO_STARTING_BALANCE)
    )
    await otherVisitor.close()
  })

  test('shows the bonus pop-up inside the viewport', async ({ page }) => {
    await openGame(page, 'fruit-frenzy')
    await spin(page)
    await spin(page)

    const box = await bonusDialog(page).boundingBox()
    const viewport = page.viewportSize()

    expect(box).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height)
    await expectNoHorizontalScroll(page)
  })

  test('handles an unknown game', async ({ page }) => {
    await page.goto('/games/missing')

    await expect(page.getByText('Game not found.')).toBeVisible()
    await expect(spinButton(page)).toHaveCount(0)
  })
})
