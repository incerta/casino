import { expect, test, type Page } from '@playwright/test'

import { readVisitorEvents } from '../helpers/events'
import {
  bonusDialog,
  cashOut,
  cashOutButton,
  changeBet,
  expectNoHorizontalScroll,
  getVisitorId,
  go,
  goButton,
  openGame,
  startRun,
  stat,
} from '../helpers/game'

const DEMO_STARTING_BALANCE = 1000

/**
 * Starts runs until the chicken survives its first lane. A hit is a valid
 * server outcome (and rare on easy), so it is checked and retried.
 */
async function startRunAndCrossOnce(page: Page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await startRun(page)
    const outcome = await go(page)
    if (outcome === 'crossed') return
    await expect(
      page.getByText('Hit by a car on lane 1 (simulated)')
    ).toBeVisible()
  }
  throw new Error('The chicken never survived the first lane')
}

test.describe('Chicken Cross', () => {
  test('starts a run, crosses a lane and cashes out', async ({ page }) => {
    await openGame(page, 'chicken-cross')
    await changeBet(page, 25)

    await startRunAndCrossOnce(page)
    const visitorId = await getVisitorId(page)
    const started = (await readVisitorEvents(visitorId)).findLast(
      (event) => event.kind === 'road_run_started'
    )
    expect(started).toMatchObject({
      gameId: 'chicken-cross',
      bet: 25,
      difficulty: 'easy',
    })
    await expect(page.getByText(/^Lane 1 crossed/)).toBeVisible()

    await cashOut(page)

    const cashedOut = (await readVisitorEvents(visitorId)).find(
      (event) => event.kind === 'road_run_cashed_out'
    )
    expect(cashedOut).toMatchObject({
      runId: started?.runId,
      lane: 1,
      simulated: true,
      win: Math.floor(25 * Number(cashedOut?.multiplier)),
      balanceAfter: Number(started?.balanceAfter) + Number(cashedOut?.win),
    })
    await expect(
      page.getByText(`Cashed out ${cashedOut?.win} demo credits (simulated)`)
    ).toBeVisible()
    await expect(stat(page, 'Demo balance')).toHaveText(
      String(cashedOut?.balanceAfter)
    )
  })

  test('deducts the bet and locks the settings during a run', async ({
    page,
  }) => {
    await openGame(page, 'chicken-cross')
    const difficulty = page.getByRole('group', { name: 'Difficulty' })
    await difficulty.getByRole('button', { name: 'Hard', exact: true }).click()
    await expect(
      difficulty.getByRole('button', { name: 'Hard', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')

    await startRun(page)

    await expect(stat(page, 'Demo balance')).toHaveText(
      String(DEMO_STARTING_BALANCE - 10)
    )
    await expect(
      difficulty.getByRole('button', { name: 'Easy' })
    ).toBeDisabled()
    await expect(
      page.getByRole('group', { name: 'Bet' }).getByRole('button', {
        name: '25',
      })
    ).toBeDisabled()
    await expect(cashOutButton(page)).toBeDisabled()
    await expect(goButton(page)).toBeEnabled()

    const events = await readVisitorEvents(await getVisitorId(page))
    expect(events.at(-1)).toMatchObject({
      kind: 'road_run_started',
      difficulty: 'hard',
      bet: 10,
      balanceAfter: DEMO_STARTING_BALANCE - 10,
    })

    await page.reload()
    await expect(goButton(page)).toBeEnabled()
    await expect(
      difficulty.getByRole('button', { name: 'Hard', exact: true })
    ).toBeDisabled()
    await expectNoHorizontalScroll(page)
  })

  test('offers the simulated bonus after two finished runs', async ({
    page,
  }) => {
    await openGame(page, 'chicken-cross')

    for (let run = 1; run <= 2; run++) {
      await expect(bonusDialog(page)).toBeHidden()
      await startRun(page)
      if ((await go(page)) === 'crossed') await cashOut(page)
    }

    await expect(bonusDialog(page)).toBeVisible()
    await expect(stat(page, 'Rounds')).toHaveText('2')

    const kinds = (await readVisitorEvents(await getVisitorId(page))).map(
      (event) => event.kind
    )
    expect(kinds.filter((kind) => kind === 'bonus_offered')).toHaveLength(1)
    expect(kinds.at(-1)).toBe('bonus_offered')
  })
})
