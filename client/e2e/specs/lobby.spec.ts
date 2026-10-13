import { expect, test } from '@playwright/test'

import { expectNoHorizontalScroll } from '../helpers/game'

test.describe('Lobby', () => {
  test('lists both demo games and labels them as simulated', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'Incerta Casino', level: 1 })
    ).toBeVisible()
    await expect(page.getByText('Demo · simulated outcomes')).toBeVisible()

    const cards = page.getByRole('listitem')
    await expect(cards).toHaveCount(2)
    await expect(
      page.getByRole('heading', { name: 'Lucky Sevens' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Fruit Frenzy' })
    ).toBeVisible()

    await expectNoHorizontalScroll(page)
  })

  test('opens a game from its card', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /Fruit Frenzy/ }).click()

    await expect(page).toHaveURL('/games/fruit-frenzy')
    await expect(
      page.getByRole('heading', { name: 'Fruit Frenzy', level: 1 })
    ).toBeVisible()
    await expect(page.getByText('Test environment · simulated')).toBeVisible()
  })
})
