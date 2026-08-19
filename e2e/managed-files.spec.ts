import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

const requiredEnv = [
  'E2E_SUPABASE_URL',
  'E2E_SUPABASE_ANON_KEY',
  'E2E_SUPABASE_SERVICE_ROLE_KEY',
  'E2E_INTERNAL_EMAIL',
  'E2E_INTERNAL_PASSWORD',
  'E2E_TEST_ORGANIZATION_ID'
] as const;

function env(name: (typeof requiredEnv)[number]) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for managed-files E2E`);
  return value.replace(/\/$/, '');
}

function encodedObjectPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

test('internal user uploads and views a private managed file', async ({ request }) => {
  for (const key of requiredEnv) env(key);

  const supabaseUrl = env('E2E_SUPABASE_URL');
  const anonKey = env('E2E_SUPABASE_ANON_KEY');
  const serviceRoleKey = env('E2E_SUPABASE_SERVICE_ROLE_KEY');
  const organizationId = env('E2E_TEST_ORGANIZATION_ID');

  // The canonical production project is never a valid E2E target.
  expect(supabaseUrl).not.toContain('tqwnsxjrlomosfblleqy');

  const auth = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, 'content-type': 'application/json' },
    data: {
      email: env('E2E_INTERNAL_EMAIL'),
      password: env('E2E_INTERNAL_PASSWORD')
    }
  });
  expect(auth.ok()).toBeTruthy();
  const session = (await auth.json()) as { access_token: string };
  expect(session.access_token).toBeTruthy();

  const documentId = randomUUID();
  const objectPath = `${organizationId}/${documentId}/e2e-${Date.now()}.txt`;
  const body = `ksp-managed-files-e2e:${documentId}`;
  const encodedPath = encodedObjectPath(objectPath);

  const serviceHeaders = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`
  };
  const userHeaders = {
    apikey: anonKey,
    authorization: `Bearer ${session.access_token}`
  };

  const seed = await request.post(`${supabaseUrl}/rest/v1/documents`, {
    headers: {
      ...serviceHeaders,
      'content-type': 'application/json',
      prefer: 'return=minimal'
    },
    data: {
      id: documentId,
      organization_id: organizationId,
      title: 'Managed files E2E fixture',
      storage_path: objectPath,
      classification: 'internal',
      client_visible: false,
      status: 'active'
    }
  });
  expect(seed.ok()).toBeTruthy();

  try {
    const upload = await request.post(`${supabaseUrl}/storage/v1/object/managed-files/${encodedPath}`, {
      headers: {
        ...userHeaders,
        'content-type': 'text/plain',
        'x-upsert': 'false'
      },
      data: body
    });
    expect(upload.ok()).toBeTruthy();

    const view = await request.get(`${supabaseUrl}/storage/v1/object/authenticated/managed-files/${encodedPath}`, {
      headers: userHeaders
    });
    expect(view.ok()).toBeTruthy();
    expect(await view.text()).toBe(body);

    const anonymousView = await request.get(
      `${supabaseUrl}/storage/v1/object/authenticated/managed-files/${encodedPath}`,
      { headers: { apikey: anonKey } }
    );
    expect(anonymousView.ok()).toBeFalsy();
  } finally {
    // Cleanup uses service-role credentials only in the Node test process; never in browser code.
    await request.delete(`${supabaseUrl}/storage/v1/object/managed-files/${encodedPath}`, {
      headers: serviceHeaders
    });
    await request.delete(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`, {
      headers: serviceHeaders
    });
  }
});
