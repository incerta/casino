import { expect, test } from '@playwright/test'

import { readVisitorEventKinds, readVisitorEvents } from '../helpers/events'
import {
  bonusDialog,
  changeBet,
  expectNoHorizontalScroll,
  getVisitorId,
  openGame,
  roll,
  stat,
} from '../helpers/game'

const DEMO_STARTING_BALANCE = 1000

function formatRoll(roll: number) {
  return (roll / 100).toFixed(2).padStart(5, '0')
}

test.describe('Neon Dice', () => {
  test('shows the odds for the chosen target and direction', async ({
    page,
  }) => {
    await openGame(page, 'neon-dice')

    await expect(stat(page, 'Win chance')).toHaveText('50%')
    await expect(stat(page, 'Multiplier')).toHaveText('1.98x')
    await expect(stat(page, 'Payout on win')).toHaveText('19')

    await page.getByRole('slider', { name: 'Target' }).fill('25')
    await expect(stat(page, 'Win chance')).toHaveText('25%')
    await expect(stat(page, 'Multiplier')).toHaveText('3.96x')

    await page.getByRole('button', { name: 'Roll over' }).click()
    await expect(stat(page, 'Win chance')).toHaveText('75%')
    await expect(stat(page, 'Multiplier')).toHaveText('1.32x')
    await expect(page.getByText('Pick a target and press Roll')).toBeVisible()

    await expectNoHorizontalScroll(page)
  })

  test('records a server-decided roll and renders it', async ({ page }) => {
    await openGame(page, 'neon-dice')
    await changeBet(page, 25)
    await page.getByRole('slider', { name: 'Target' }).fill('30')
    await page.getByRole('button', { name: 'Roll over' }).click()

    await roll(page)

    const events = await readVisitorEvents(await getVisitorId(page))
    const rolled = events.find((event) => event.kind === 'dice_rolled')
    const rollValue = Number(rolled?.roll)
    const win = Number(rolled?.win)

    expect(rolled).toMatchObject({
      gameId: 'neon-dice',
      bet: 25,
      target: 30,
      direction: 'over',
      multiplier: 1.41,
      simulated: true,
      balanceAfter: DEMO_STARTING_BALANCE - 25 + win,
    })
    expect(win).toBe(rollValue >= 3000 ? Math.floor(25 * 1.41) : 0)

    await expect(stat(page, 'Demo balance')).toHaveText(
      String(rolled?.balanceAfter)
    )
    await expect(
      page.getByText(
        win > 0
          ? `Rolled ${formatRoll(rollValue)} · You won ${win} demo credits (simulated)`
          : `Rolled ${formatRoll(rollValue)} · No win this time`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('list', { name: 'Recent rolls' }).getByRole('listitem')
    ).toHaveText([formatRoll(rollValue)])
  })

  test('offers the simulated bonus after two rolls and remembers the claim', async ({
    page,
  }) => {
    await openGame(page, 'neon-dice')

    await roll(page)
    await expect(bonusDialog(page)).toBeHidden()
    await roll(page)

    await bonusDialog(page).getByRole('button', { name: 'Claim Bonus' }).click()
    await expect(page.getByText('Simulated bonus claimed')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Simulated bonus claimed')).toBeVisible()
    await expect(bonusDialog(page)).toBeHidden()

    expect(await readVisitorEventKinds(await getVisitorId(page))).toEqual([
      'game_opened',
      'dice_rolled',
      'dice_rolled',
      'bonus_offered',
      'bonus_claimed',
      'game_opened',
    ])
  })
})
