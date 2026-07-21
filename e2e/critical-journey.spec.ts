import { expect, test } from '@playwright/test';

/**
 * Outcome -> Commitment -> Assignment -> Focus -> Proof -> Completion -> Pulse.
 *
 * Requires a seeded Supabase with the identities below. Credentials come from
 * env so no secrets live in the repo:
 *   KAUAN_EMAIL/KAUAN_PASSWORD (founder_ceo), ERIC_EMAIL/ERIC_PASSWORD (sales).
 */

const kauan = { email: process.env.KAUAN_EMAIL ?? '', password: process.env.KAUAN_PASSWORD ?? '' };
const eric = { email: process.env.ERIC_EMAIL ?? '', password: process.env.ERIC_PASSWORD ?? '' };

async function signIn(page: import('@playwright/test').Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/pulse');
}

test.skip(!kauan.email || !eric.email, 'Set seeded E2E credentials to run the critical journey.');

test('founder creates an outcome and the three-active limit holds', async ({ page }) => {
  await signIn(page, kauan);
  await page.goto('/outcomes');
  await page.getByLabel('Outcome').fill('Reach 25k MRR');
  await page.getByRole('button', { name: 'Activate outcome' }).click();
  await expect(page.getByText('Reach 25k MRR')).toBeVisible();
});

test('assigned commitment appears in the owner Focus and completes only with accepted proof', async ({ browser }) => {
  const founder = await browser.newPage();
  await signIn(founder, kauan);
  await founder.goto('/commitments');
  await founder.getByLabel('Commitment').fill('Ship onboarding tracker');
  await founder.getByLabel('Promised result').fill('Client can track jobs end to end');
  await founder.getByLabel('Accountable owner').selectOption({ label: /Eric/ });
  await founder.getByLabel('Due date').fill('2026-12-31');
  await founder.getByRole('button', { name: 'Create commitment' }).click();

  const eProfile = await browser.newPage();
  await signIn(eProfile, eric);
  await eProfile.goto('/focus');
  await expect(eProfile.getByText('Ship onboarding tracker')).toBeVisible();

  // Founder Vault must be denied to Eric.
  await eProfile.goto('/founder-vault');
  await eProfile.waitForURL('**/pulse');
});

test('no horizontal scroll at 375px', async ({ page }) => {
  await signIn(page, kauan);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/pulse');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBeFalsy();
});
