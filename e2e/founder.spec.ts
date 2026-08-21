import { expect, test } from '@playwright/test';

const kauan = { email: process.env.KAUAN_EMAIL ?? '', password: process.env.KAUAN_PASSWORD ?? '' };
const eric = { email: process.env.ERIC_EMAIL ?? '', password: process.env.ERIC_PASSWORD ?? '' };

async function signIn(page: import('@playwright/test').Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/home');
}

const founderPrivateRoutes = [
  '/founder/home',
  '/founder/inbox',
  '/founder/ideas',
  '/founder/projects',
  '/founder/knowledge',
  '/founder/truth',
  '/founder/sources',
  '/founder/context',
  '/founder/handoffs',
  '/founder/ai-access',
  '/founder/ai-inbox',
  '/founder/work',
  '/founder/vault'
];

test.skip(!kauan.email || !eric.email, 'Set seeded E2E credentials to run Founder OS tests.');

test.describe('Founder Second Brain access', () => {
  test('non-founder is denied every founder-private surface', async ({ page }) => {
    await signIn(page, eric);
    for (const route of founderPrivateRoutes) {
      await page.goto(route);
      await page.waitForURL('**/pulse');
    }
  });

  test('founder can reach the Second Brain hubs', async ({ page }) => {
    await signIn(page, kauan);

    await page.goto('/founder/home');
    await expect(page.getByText('Private · Second Brain')).toBeVisible();
    await expect(page.getByText('What’s on your mind?')).toBeVisible();

    await page.goto('/founder/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();

    await page.goto('/founder/knowledge');
    await expect(page.getByRole('heading', { name: 'Knowledge' })).toBeVisible();

    await page.goto('/founder/truth');
    await expect(page.getByRole('heading', { name: 'Truth' })).toBeVisible();

    await page.goto('/founder/sources');
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();

    await page.goto('/founder/context');
    await expect(page.getByRole('heading', { name: 'Context Packs' })).toBeVisible();

    await page.goto('/founder/handoffs');
    await expect(page.getByRole('heading', { name: 'Handoffs' })).toBeVisible();

    await page.goto('/founder/ai-access');
    await expect(page.getByRole('heading', { name: 'AI Access' })).toBeVisible();

    await page.goto('/founder/work');
    await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();

    await page.goto('/founder/vault');
    await expect(page.getByRole('heading', { name: 'Vault' })).toBeVisible();
  });

  test('mobile Second Brain nav stays intentionally small', async ({ page }) => {
    await signIn(page, kauan);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/founder/home');

    const nav = page.getByRole('navigation', { name: 'Second Brain mobile' });
    await expect(nav.getByText('Home', { exact: true })).toBeVisible();
    await expect(nav.getByText('Inbox', { exact: true })).toBeVisible();
    await expect(nav.getByText('Knowledge', { exact: true })).toBeVisible();
    await expect(nav.getByText('My Work', { exact: true })).toBeVisible();
    await expect(nav.getByText('Company', { exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBeFalsy();
  });
});

test.describe('Founder OS functionality', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, kauan);
  });

  test('can capture and triage an inbox item', async ({ page }) => {
    await page.goto('/founder/inbox');

    const title = `E2E Test Note ${Date.now()}`;
    await page.getByLabel('Capture').fill(title);
    await page.getByLabel('Type').selectOption('note');
    await page.getByLabel('Details').fill('This is a test note body');
    await page.getByRole('button', { name: 'Capture' }).click();

    await expect(page.getByText(title)).toBeVisible();
    await page.getByRole('button', { name: 'Make private task' }).first().click();
    await expect(page.getByText('Promoted to KSP')).not.toBeVisible();

    await page.goto('/founder/work');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('can create and manage a private task', async ({ page }) => {
    await page.goto('/founder/work');

    const title = `E2E Test Task ${Date.now()}`;
    await page.getByLabel('New private task').fill(title);
    await page.getByLabel('Priority').selectOption('high');
    await page.getByRole('button', { name: 'Add task' }).click();

    await expect(page.getByText(title)).toBeVisible();
    await page.getByRole('button', { name: 'Waiting…' }).first().click();
    await page.getByPlaceholder('waiting on…').fill('Someone');
    await page.getByRole('button', { name: 'Set' }).first().click();
    await expect(page.getByText('waiting on Someone')).toBeVisible();
  });
});
