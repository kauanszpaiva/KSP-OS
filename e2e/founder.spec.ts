import { expect, test } from '@playwright/test';

const kauan = { email: process.env.KAUAN_EMAIL ?? '', password: process.env.KAUAN_PASSWORD ?? '' };
const eric = { email: process.env.ERIC_EMAIL ?? '', password: process.env.ERIC_PASSWORD ?? '' };

async function signIn(page: import('@playwright/test').Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/pulse');
}



test.skip(!kauan.email || !eric.email, 'Set seeded E2E credentials to run Founder OS tests.');

test.describe('Founder OS Access', () => {
  test('non-founder is denied access and redirected', async ({ page }) => {
    await signIn(page, eric);

    // Attempt to access Founder Home
    await page.goto('/founder/home');
    await page.waitForURL('**/pulse');

    // Attempt to access Founder Inbox
    await page.goto('/founder/inbox');
    await page.waitForURL('**/pulse');

    // Attempt to access Founder Work
    await page.goto('/founder/work');
    await page.waitForURL('**/pulse');

    // Attempt to access Founder Vault
    await page.goto('/founder/vault');
    await page.waitForURL('**/pulse');
  });

  test('founder has access to all surfaces', async ({ page }) => {
    await signIn(page, kauan);

    // Home
    await page.goto('/founder/home');
    await expect(page.getByText('Good to see you')).toBeVisible();

    // Inbox
    await page.goto('/founder/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();

    // Work
    await page.goto('/founder/work');
    await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();

    // Vault
    await page.goto('/founder/vault');
    await expect(page.getByRole('heading', { name: 'Vault' })).toBeVisible();
  });
});

test.describe('Founder OS Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, kauan);
  });

  test('can capture and triage an inbox item', async ({ page }) => {
    await page.goto('/founder/inbox');

    // Capture
    const title = `E2E Test Note ${Date.now()}`;
    await page.getByLabel('Capture').fill(title);
    await page.getByLabel('Type').selectOption('note');
    await page.getByLabel('Details').fill('This is a test note body');
    await page.getByRole('button', { name: 'Capture' }).click();

    // Verify it appears in the active list
    await expect(page.getByText(title)).toBeVisible();

    // Convert to task
    await page.getByRole('button', { name: 'Make private task' }).first().click();

    // Verify it moved to processed
    await expect(page.getByText('Promoted to KSP')).not.toBeVisible();

    // Go to work page and verify it's there
    await page.goto('/founder/work');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('can create and manage a private task', async ({ page }) => {
    await page.goto('/founder/work');

    // Create task
    const title = `E2E Test Task ${Date.now()}`;
    await page.getByLabel('New private task').fill(title);
    await page.getByLabel('Priority').selectOption('high');
    await page.getByRole('button', { name: 'Add task' }).click();

    // Verify it appears
    await expect(page.getByText(title)).toBeVisible();

    // Set to waiting
    await page.getByRole('button', { name: 'Waiting…' }).first().click();
    await page.getByPlaceholder('waiting on…').fill('Someone');
    await page.getByRole('button', { name: 'Set' }).first().click();

    // Verify it moved to waiting
    await expect(page.getByText('waiting on Someone')).toBeVisible();
  });
});
