import { describe, expect, it } from 'vitest';
import { evaluateWhatsAppWebhookRuntimeGate } from './whatsapp-runtime';

const production = {
  enabled: true,
  requestHost: 'ksp-os-inc.vercel.app',
  allowedHost: 'ksp-os-inc.vercel.app',
  supabaseUrl: 'https://tqwnsxjrlomosfblleqy.supabase.co',
  expectedProjectRef: 'tqwnsxjrlomosfblleqy',
};

describe('WhatsApp webhook runtime isolation gate', () => {
  it('allows only an explicitly enabled matching host and Supabase project', () => {
    expect(evaluateWhatsAppWebhookRuntimeGate(production)).toEqual({ ok: true });
  });

  it('fails closed when the feature flag is not explicitly enabled', () => {
    expect(
      evaluateWhatsAppWebhookRuntimeGate({ ...production, enabled: false }),
    ).toEqual({ ok: false, reason: 'disabled' });
  });

  it('rejects preview or unexpected hosts even if secrets exist', () => {
    expect(
      evaluateWhatsAppWebhookRuntimeGate({
        ...production,
        requestHost: 'ksp-os-inc-git-feature.vercel.app',
      }),
    ).toEqual({ ok: false, reason: 'host_mismatch' });
  });

  it('rejects a different Supabase project even on the approved hostname', () => {
    expect(
      evaluateWhatsAppWebhookRuntimeGate({
        ...production,
        supabaseUrl: 'https://previewproject.supabase.co',
      }),
    ).toEqual({ ok: false, reason: 'database_mismatch' });
  });

  it('requires both the allowed host and expected database ref', () => {
    expect(
      evaluateWhatsAppWebhookRuntimeGate({ ...production, allowedHost: '' }),
    ).toEqual({ ok: false, reason: 'missing_allowed_host' });
    expect(
      evaluateWhatsAppWebhookRuntimeGate({ ...production, expectedProjectRef: '' }),
    ).toEqual({ ok: false, reason: 'missing_project_ref' });
  });
});
