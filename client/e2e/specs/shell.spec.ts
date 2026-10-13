import { expect, test } from '@playwright/test'

import { expectNoHorizontalScroll, openMenu } from '../helpers/game'

test.describe('Shell', () => {
  test('shows unavailable sections as disabled "Soon" items', async ({
    page,
  }) => {
    await page.goto('/')
    await openMenu(page)

    const menu = page.getByRole('complementary', { name: 'Main menu' })
    for (const label of [
      'Sports',
      'Promotions',
      'Loyalty',
      'Missions',
      'Tournaments',
    ]) {
      const item = menu.getByRole('button', { name: new RegExp(`^${label}`) })
      await expect(item).toBeDisabled()
      await expect(item).toContainText('Soon')
    }
    await expect(menu.getByRole('link', { name: 'Home' })).toBeVisible()
  })

  test('explains that Login, Register and support are demo only', async ({
    page,
  }) => {
    await page.goto('/')

    for (const name of ['Login', 'Register']) {
      await page.getByRole('button', { name, exact: true }).click()
      const notice = page.getByRole('dialog', {
        name: 'Demo only, no accounts',
      })
      await expect(notice).toBeVisible()
      await expect(notice.getByText('no real-money value')).toBeVisible()
      await notice.getByRole('button', { name: 'Got it' }).click()
      await expect(notice).toBeHidden()
    }

    await page.getByRole('button', { name: 'Support chat' }).click()
    const support = page.getByRole('dialog', {
      name: 'Demo only, no live support',
    })
    await expect(support).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(support).toBeHidden()
  })

  test('opens the menu as a drawer on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The sidebar is always shown on desktop')

    await page.goto('/')
    const menu = page.getByRole('complementary', { name: 'Main menu' })
    await expect(menu.getByRole('link', { name: 'Home' })).toBeHidden()

    await page.getByRole('button', { name: 'Toggle menu' }).click()
    await menu.getByRole('link', { name: 'Instant games' }).click()

    await expect(page).toHaveURL('/?category=instant')
    await expect(menu.getByRole('link', { name: 'Home' })).toBeHidden()
    await expectNoHorizontalScroll(page)
  })

  test('collapses the sidebar to icons on desktop', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Mobile uses a drawer instead')

    await page.goto('/')
    const menu = page.getByRole('complementary', { name: 'Main menu' })
    const before = await menu.boundingBox()

    await page.getByRole('button', { name: 'Toggle menu' }).click()

    await expect
      .poll(async () => (await menu.boundingBox())?.width)
      .toBeLessThan(before!.width)
  })
})
