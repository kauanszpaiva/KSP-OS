// Executes the real Deno handler with isolated provider adapters. No network,
// accounts, email delivery or hosted data are used by these tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash, webcrypto } from 'node:crypto';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const path = 'supabase/functions/ksp-portal-invite-signup/index.ts';
const source = fs.readFileSync(path, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const token = 'a'.repeat(64);
const email = 'client@example.invalid';
const input = { token, email, password: 'synthetic-password' };
const cases = [];
// Supabase PostgrestBuilder implements PromiseLike (.then), not Promise.catch.
const queryResult = run => ({ then: (yes, no) => Promise.resolve().then(run).then(yes, no) });
function test(name, fn) { cases.push({ name, fn }); }
function fixture(options = {}) {
  const calls = [];
  const log = [];
  const invitation = { id: 'synthetic-invitation', email, revoked_at: null, accepted_at: null, expires_at: '2099-01-01T00:00:00Z', ...options.invitation };
  let handler;
  const api = {
    from(table) {
      calls.push(['from', table]);
      const query = { select: () => query, or: value => { calls.push(['hash-filter', value]); return query; }, order: () => query, limit: () => query,
        maybeSingle: () => queryResult(() => {
          if (options.queryThrows) throw new Error('PRIVATE_QUERY_FAILURE');
          return { data: options.missingInvite ? null : invitation, error: options.queryError ? { message: 'PRIVATE_QUERY_FAILURE' } : null };
        })
      }; return query;
    },
    auth: { admin: {
      createUser: async value => {
        calls.push(['create', value]);
        if (options.createThrows) throw new Error('PRIVATE_CREATE_FAILURE');
        return options.existing ? { data: { user: null }, error: { message: 'existing account' } } : { data: { user: { id: 'created-this-request' } }, error: null };
      },
      generateLink: async value => {
        calls.push(['link', value]);
        if (options.linkThrows) throw new Error('PRIVATE_LINK_FAILURE');
        return { data: options.linkError ? null : { properties: { hashed_token: 'synthetic-confirmation-hash' } }, error: options.linkError ? { message: 'PRIVATE_LINK_FAILURE' } : null };
      },
      deleteUser: async id => {
        calls.push(['rollback', id]);
        if (options.rollbackThrows) throw new Error('PRIVATE_ROLLBACK_FAILURE');
        return { error: options.rollbackError ? { message: 'PRIVATE_ROLLBACK_FAILURE' } : null };
      }
    } },
    rpc: name => queryResult(() => {
      calls.push(['rpc', name]);
      if (options.keyThrows) throw new Error('PRIVATE_KEY_FAILURE');
      return { data: options.keyMissing ? null : 'synthetic-provider-placeholder', error: null };
    })
  };
  class Resend {
    emails = { send: async (payload, opts) => {
      calls.push(['send', payload, opts]);
      if (options.sendThrows) throw new Error('PRIVATE_SEND_FAILURE');
      return { data: options.sendError ? null : { id: 'synthetic-message' }, error: options.sendError ? { message: 'PRIVATE_SEND_FAILURE' } : null };
    } };
  }
  const context = {
    exports: {}, require: name => {
      if (name.startsWith('npm:@supabase/')) return { createClient: () => api };
      if (name.startsWith('npm:resend')) return { Resend };
      throw new Error(`Unexpected import: ${name}`);
    },
    Deno: { serve: fn => { handler = fn; }, env: { get: name => options.envMissing ? undefined : name === 'SUPABASE_URL' ? 'https://project.example.invalid' : 'synthetic-runtime-placeholder' } },
    Request, Response, URL, TextEncoder, TextDecoder, Uint8Array, crypto: webcrypto,
    console: { error: (...items) => log.push(items) }
  };
  vm.runInNewContext(compiled, context, { filename: path, timeout: 2000 });
  async function request(body = input, override = {}) {
    const method = override.method ?? 'POST';
    const req = new Request('https://project.example.invalid/functions/v1/ksp-portal-invite-signup', {
      method, headers: { 'Content-Type': 'application/json', Origin: 'https://kspdominionportal.com', ...override.headers },
      ...(['GET', 'HEAD'].includes(method) ? {} : { body: override.raw ?? JSON.stringify(body) })
    });
    const response = await handler(req);
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers, text };
  }
  return { request, calls, log };
}
function count(f, operation) { return f.calls.filter(c => c[0] === operation).length; }
function noAccountWrites(f) { for (const op of ['create', 'link', 'rollback', 'send']) assert.equal(count(f, op), 0, `${op} unexpectedly called`); }
function clean(result) { assert.equal(result.text.includes('PRIVATE_'), false); }

test('GET rejected before provider access', async () => { const f = fixture(); assert.equal((await f.request(null, { method: 'GET' })).status, 405); assert.equal(f.calls.length, 0); });
test('preflight accepts the canonical portal', async () => { const f = fixture(); const r = await f.request(null, { method: 'OPTIONS' }); assert.equal(r.status, 204); assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://kspdominionportal.com'); assert.equal(f.calls.length, 0); });
test('untrusted origin rejected before provider access', async () => { const f = fixture(); assert.equal((await f.request(input, { headers: { Origin: 'https://untrusted.example.invalid' } })).status, 403); assert.equal(f.calls.length, 0); });
test('invalid JSON is a controlled 400', async () => { const f = fixture(); assert.equal((await f.request(null, { raw: '{' })).status, 400); noAccountWrites(f); });
for (const payload of [null, [], 17, 'text']) test(`non-object JSON rejected: ${JSON.stringify(payload)}`, async () => { const f = fixture(); assert.equal((await f.request(payload)).status, 400); assert.equal(f.calls.length, 0); });
test('non-string password is not coerced into an account credential', async () => { const f = fixture(); assert.equal((await f.request({ ...input, password: 123456789 })).status, 400); noAccountWrites(f); });
test('oversized payload rejected before provider access', async () => { const f = fixture(); assert.equal((await f.request({ ...input, extra: 'x'.repeat(9000) })).status, 413); assert.equal(f.calls.length, 0); });
for (const variation of [{ token: 'not-a-token' }, { email: 'bad' }, { password: 'short' }, { password: 'x'.repeat(129) }]) test(`invalid field rejected: ${Object.keys(variation)[0]} ${Object.values(variation)[0].length}`, async () => { const f = fixture(); assert.equal((await f.request({ ...input, ...variation })).status, 400); noAccountWrites(f); });
for (const [label, opts] of [['missing', { missingInvite: true }], ['revoked', { invitation: { revoked_at: '2026-01-01' } }], ['accepted', { invitation: { accepted_at: '2026-01-01' } }], ['expired', { invitation: { expires_at: '2020-01-01' } }], ['invalid expiry', { invitation: { expires_at: 'invalid' } }], ['email mismatch', { invitation: { email: 'another@example.invalid' } }]]) test(`${label} invitation cannot create an account`, async () => { const f = fixture(opts); assert.equal((await f.request()).status, 400); noAccountWrites(f); });
test('invitation lookup failure returns controlled 503', async () => { const f = fixture({ queryThrows: true }); const r = await f.request(); assert.equal(r.status, 503); noAccountWrites(f); clean(r); });
test('database error is service unavailable, not a rejected invitation', async () => { const f = fixture({ queryError: true }); assert.equal((await f.request()).status, 503); noAccountWrites(f); });
test('missing runtime configuration fails without writes', async () => { const f = fixture({ envMissing: true }); assert.equal((await f.request()).status, 503); noAccountWrites(f); });
test('existing account is never overwritten or deleted', async () => { const f = fixture({ existing: true }); const r = await f.request(); assert.equal(r.status, 409); assert.equal(count(f, 'create'), 1); assert.equal(count(f, 'link'), 0); assert.equal(count(f, 'rollback'), 0); assert.equal(count(f, 'send'), 0); });
test('account provider exception returns controlled 503 without cleanup of unknown accounts', async () => { const f = fixture({ createThrows: true }); const r = await f.request(); assert.equal(r.status, 503); assert.equal(count(f, 'rollback'), 0); clean(r); });
for (const [label, opts] of [['link error', { linkError: true }], ['link exception', { linkThrows: true }], ['key missing', { keyMissing: true }], ['key exception', { keyThrows: true }], ['send error', { sendError: true }], ['send exception', { sendThrows: true }]]) test(`${label} preserves confirmation and only cleans up this request's new account`, async () => { const f = fixture(opts); const r = await f.request(); assert.equal(r.status, 503); assert.deepEqual(f.calls.filter(c => c[0] === 'rollback').map(c => c[1]), ['created-this-request']); clean(r); });
for (const opts of [{ linkError: true, rollbackError: true }, { linkError: true, rollbackThrows: true }]) test(`cleanup failure stays controlled: ${Object.keys(opts)[1]}`, async () => { const f = fixture(opts); const r = await f.request(); assert.equal(r.status, 503); clean(r); assert.equal(JSON.stringify(f.log).includes('PRIVATE_'), false); });
test('successful path requires confirmation and sends only to the bound address', async () => {
  const f = fixture(); const r = await f.request({ ...input, email: ' CLIENT@EXAMPLE.INVALID ' });
  assert.equal(r.status, 200); assert.equal(r.body.requires_confirmation, true);
  const created = f.calls.find(c => c[0] === 'create')[1];
  assert.equal(created.email_confirm, false); assert.equal(created.email, email);
  assert.equal(count(f, 'create'), 1); assert.equal(count(f, 'send'), 1); assert.equal(count(f, 'rollback'), 0);
  const hash = createHash('sha256').update(token).digest('hex');
  assert.ok(f.calls.some(c => c[0] === 'hash-filter' && c[1].includes(hash)));
  const send = f.calls.find(c => c[0] === 'send');
  assert.deepEqual(Array.from(send[1].to), [email]);
  const url = new URL(send[1].template.variables.ACTION_URL);
  assert.equal(url.origin, 'https://kspdominionportal.com'); assert.equal(url.pathname, '/auth/confirm');
  assert.equal(url.searchParams.get('type'), 'signup'); assert.equal(url.searchParams.get('next'), `/invite/${token}`);
  assert.ok(send[2].idempotencyKey.includes('synthetic-invitation/created-this-request'));
  assert.equal(r.headers.get('Cache-Control'), 'no-store'); assert.equal(r.text.includes(token), false);
});
const results = [];
for (const c of cases) {
  try { await c.fn(); results.push({ name: c.name, pass: true }); console.log(`PASS ${c.name}`); }
  catch (error) { results.push({ name: c.name, pass: false, error: error.message }); console.error(`FAIL ${c.name}: ${error.message}`); }
}
const report = { scope: 'real handler / mocked providers / no hosted effects', source: path, source_sha256: createHash('sha256').update(source).digest('hex'), passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, results };
fs.mkdirSync('artifacts/portal-relay', { recursive: true });
fs.writeFileSync('artifacts/portal-relay/report.json', JSON.stringify(report, null, 2));
console.log(`\n${report.passed}/${results.length} PASS, ${report.failed} FAIL`);
if (report.failed) process.exitCode = 1;
