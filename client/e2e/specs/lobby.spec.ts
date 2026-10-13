import { expect, test } from '@playwright/test'

import { expectNoHorizontalScroll } from '../helpers/game'

test.describe('Lobby', () => {
  test('shows the game sections and labels everything as simulated', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'Incerta Casino', level: 1 })
    ).toBeAttached()
    await expect(page.getByText('Demo · simulated outcomes')).toBeVisible()
    await expect(
      page.getByText('Demo environment · Simulated outcomes · No real-money')
    ).toBeVisible()

    const sections = {
      'Top games': ['Chicken Cross', 'Lucky Sevens', 'Fruit Frenzy'],
      'New games': ['Chicken Cross', 'Neon Dice'],
      Slots: ['Lucky Sevens', 'Fruit Frenzy'],
      'Instant games': ['Chicken Cross', 'Neon Dice'],
    }

    for (const [section, titles] of Object.entries(sections)) {
      const region = page.getByRole('region', { name: section })
      await expect(region.getByRole('listitem')).toHaveCount(titles.length)
      for (const title of titles) {
        await expect(
          region.getByRole('heading', { name: title, level: 3 })
        ).toBeVisible()
      }
    }

    await expectNoHorizontalScroll(page)
  })

  test('opens a game from its tile', async ({ page }) => {
    await page.goto('/')

    await page
      .getByRole('region', { name: 'Slots' })
      .getByRole('link', { name: 'Play Fruit Frenzy demo' })
      .click()

    await expect(page).toHaveURL('/games/fruit-frenzy')
    await expect(
      page.getByRole('heading', { name: 'Fruit Frenzy', level: 1 })
    ).toBeVisible()
    await expect(page.getByText('Test environment · simulated')).toBeVisible()
  })

  test('filters by category with the pills and View All', async ({ page }) => {
    await page.goto('/')

    const pills = page.getByRole('navigation', { name: 'Game categories' })
    await pills.getByRole('link', { name: 'Slots' }).click()

    await expect(page).toHaveURL('/?category=slots')
    await expect(pills.getByRole('link', { name: 'Slots' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    const results = page.getByRole('region', { name: /Slots/ })
    await expect(results.getByRole('listitem')).toHaveCount(2)

    await pills.getByRole('link', { name: 'Lobby' }).click()
    await page.getByRole('link', { name: 'View all Instant games' }).click()

    await expect(page).toHaveURL('/?category=instant')
    await expect(
      page.getByRole('region', { name: /Instant/ }).getByRole('listitem')
    ).toHaveCount(2)
  })

  test('searches games from the header', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('searchbox', { name: 'Search games' }).fill('dice')

    await expect(page).toHaveURL('/?q=dice')
    const results = page.getByRole('region', { name: /Results for/ })
    await expect(results.getByRole('listitem')).toHaveCount(1)
    await expect(
      results.getByRole('link', { name: 'Play Neon Dice demo' })
    ).toBeVisible()

    await page.getByRole('searchbox', { name: 'Search games' }).fill('zzz')
    await expect(
      page.getByText('No demo games match your search.')
    ).toBeVisible()
  })

  test('moves the hero carousel with its arrows', async ({ page }) => {
    await page.goto('/')

    const carousel = page.getByRole('region', { name: 'Featured games' })
    await expect(carousel.getByText('1/3')).toBeVisible()

    await carousel.getByRole('button', { name: 'Next slide' }).click()
    await expect(carousel.getByText('2/3')).toBeVisible()

    await carousel.getByRole('button', { name: 'Previous slide' }).click()
    await carousel.getByRole('button', { name: 'Previous slide' }).click()
    await expect(carousel.getByText('3/3')).toBeVisible()

    await carousel.getByRole('link', { name: 'Try Now' }).click()
    await expect(page).toHaveURL('/games/lucky-sevens')
  })
})
