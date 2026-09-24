// Isolated browser QA: real component/styles; synthetic storage and router.
// This is NOT authenticated Supabase or production end-to-end evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const root = process.cwd();
const output = path.join(root, 'artifacts/day-scheduler-browser');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ksp-day-browser-'));
fs.mkdirSync(output, { recursive: true });
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve('vitest'));
const viteRequire = createRequire(vitestRequire.resolve('vite'));
const { build } = viteRequire('esbuild');
const report = { scope: 'isolated component browser QA, synthetic persistence; not live Auth/Supabase', source: process.env.GITHUB_SHA ?? 'local', checks: [] };
let browser;
let server;
try {
  fs.writeFileSync(path.join(temp, 'router.js'), 'export const useRouter = () => ({ refresh: () => window.location.reload() });');
  const component = path.join(root, 'apps/command/app/(app)/_components/day-scheduler.tsx');
  await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { DayScheduler } from ${JSON.stringify(component)};
      const id = '22222222-2222-4222-8222-222222222222';
      const scenario = new URLSearchParams(location.search).get('scenario');
      const tasks = scenario === 'empty' ? [] : [
        { id, title: 'Synthetic task A', projectId: 'example', projectName: 'Example project', dueDate: '2026-10-01' },
        { id: '33333333-3333-4333-8333-333333333333', title: 'Synthetic task B', projectId: 'example', projectName: 'Example project', dueDate: null }
      ];
      const read = () => JSON.parse(localStorage.getItem('ksp-synthetic-slots') || '[]');
      window.saveCalls = 0;
      const saveSlot = async (input) => {
        window.saveCalls++;
        if (scenario === 'reject') return { ok: false, error: 'Synthetic save rejected' };
        const slot = { id: input.id, taskId: input.taskId, date: input.date, startMinute: input.startMinute, endMinute: input.endMinute, revision: input.expectedRevision + 1 };
        localStorage.setItem('ksp-synthetic-slots', JSON.stringify([...read().filter(x => x.id !== slot.id), slot]));
        return { ok: true, slot };
      };
      const removeSlot = async (id) => {
        localStorage.setItem('ksp-synthetic-slots', JSON.stringify(read().filter(x => x.id !== id)));
        return { ok: true };
      };
      document.documentElement.dataset.theme = 'dark';
      createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-6xl p-4">
        <p className="mb-4 text-sm text-ink-3">Synthetic browser verification - no production data</p>
        <DayScheduler date="2026-09-23" tasks={tasks} initialSlots={read()} saveSlot={saveSlot} removeSlot={removeSlot}/>
      </main>);
    `, resolveDir: root, loader: 'tsx' },
    bundle: true, jsx: 'automatic', outfile: path.join(temp, 'app.js'),
    alias: {
      'next/navigation': path.join(temp, 'router.js'),
      '@ksp/domain': path.join(root, 'packages/domain/src/day-schedule.ts'),
      'react': path.join(root, 'apps/command/node_modules/react'),
      'react-dom': path.join(root, 'apps/command/node_modules/react-dom')
    },
    define: { 'process.env.NODE_ENV': '"production"' }
  });
  const css = spawnSync('pnpm', ['exec', 'tailwindcss', '-c', 'tailwind.config.ts', '-i', 'app/globals.css', '-o', path.join(temp, 'app.css'), '--minify'], { cwd: path.join(root, 'apps/command'), encoding: 'utf8' });
  if (css.status !== 0) throw new Error(`CSS build failed: ${css.stderr}`);
  fs.writeFileSync(path.join(temp, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated daily schedule QA</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
  server = http.createServer((req, res) => {
    const route = new URL(req.url, 'http://localhost').pathname;
    const file = { '/': 'index.html', '/app.js': 'app.js', '/app.css': 'app.css' }[route];
    if (!file) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(path.join(temp, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  for (const [name, width, height, touch] of [['desktop',1440,900,false], ['mobile',375,812,true], ['landscape',844,390,true]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, locale: 'en-US', timezoneId: 'America/New_York', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await expect(page.getByText(/No tasks scheduled for this day/)).toBeVisible();
    await page.getByLabel('Task to schedule').selectOption('22222222-2222-4222-8222-222222222222');
    await page.getByRole('button', { name: 'Schedule task', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Schedule saved');
    const bar = page.locator('[data-testid^="slot-"]');
    await expect(bar).toHaveCSS('left', '1080px');
    if (!touch) {
      const move = page.getByRole('button', { name: 'Move Synthetic task A', exact: true });
      const box = await move.boundingBox();
      await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width/2 + 30, box.y + box.height/2, { steps: 5 });
      await page.mouse.up();
      await expect(bar).toHaveCSS('left', '1110px');
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ksp-synthetic-slots'))[0].startMinute)).toBe(555);
      await move.focus();
      await page.keyboard.press('ArrowLeft');
      await expect(bar).toHaveCSS('left', '1080px');
      report.checks.push(`${name}: real pointer drag and keyboard scheduling passed`);
    }
    await page.getByRole('button', { name: 'Edit times', exact: true }).click();
    await page.getByLabel('Start time', { exact: true }).selectOption('09:30');
    await page.getByLabel('End time', { exact: true }).selectOption('10:30');
    await page.getByRole('button', { name: 'Save times', exact: true }).click();
    await expect(bar).toHaveCSS('left', '1140px');
    await page.reload();
    await expect(bar).toHaveCSS('left', '1140px');
    await expect(bar).toHaveCSS('width', '120px');
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(fits).toBe(true);
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    await page.getByLabel('Task to schedule').selectOption('33333333-3333-4333-8333-333333333333');
    await page.getByRole('button', { name: 'Schedule task', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('overlaps another task');
    await page.getByRole('button', { name: 'Unschedule', exact: true }).click();
    await expect(page.getByText(/No tasks scheduled for this day/)).toBeVisible();
    expect(errors).toEqual([]);
    report.checks.push(`${name}: creation, manual resize, reload via synthetic storage, overlap rejection, unschedule, no page overflow/errors passed`);
    await ctx.close();
  }
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  fs.rmSync(temp, { recursive: true, force: true });
  console.log(JSON.stringify(report, null, 2));
}
