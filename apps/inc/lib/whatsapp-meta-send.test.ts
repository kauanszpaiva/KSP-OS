import { describe, expect, it } from 'vitest';
import {
  buildMetaTextSendRequest,
  verifyInternalBearer,
  withinWhatsAppCustomerServiceWindow,
} from './whatsapp-meta-send';

describe('Meta WhatsApp outbound safety policy', () => {
  it('builds only the official Cloud API text-message shape', () => {
    expect(
      buildMetaTextSendRequest({
        graphVersion: 'v23.0',
        phoneNumberId: '123456789',
        recipient: '+1 (978) 555-0100',
        body: 'Hello from KSP',
      }),
    ).toEqual({
      url: 'https://graph.facebook.com/v23.0/123456789/messages',
      body: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '19785550100',
        type: 'text',
        text: { preview_url: false, body: 'Hello from KSP' },
      },
    });
  });

  it('rejects malformed Graph versions, routing identifiers and oversized text', () => {
    expect(
      buildMetaTextSendRequest({
        graphVersion: 'latest',
        phoneNumberId: '123',
        recipient: '+19785550100',
        body: 'hello',
      }),
    ).toBeNull();
    expect(
      buildMetaTextSendRequest({
        graphVersion: 'v23.0',
        phoneNumberId: '',
        recipient: '+19785550100',
        body: 'hello',
      }),
    ).toBeNull();
    expect(
      buildMetaTextSendRequest({
        graphVersion: 'v23.0',
        phoneNumberId: '123',
        recipient: '+19785550100',
        body: 'x'.repeat(4097),
      }),
    ).toBeNull();
  });

  it('allows free-form replies only within 24 hours of the latest inbound message', () => {
    const now = Date.parse('2026-08-26T16:00:00.000Z');
    expect(
      withinWhatsAppCustomerServiceWindow('2026-08-25T16:00:00.000Z', now),
    ).toBe(true);
    expect(
      withinWhatsAppCustomerServiceWindow('2026-08-25T15:59:59.999Z', now),
    ).toBe(false);
    expect(withinWhatsAppCustomerServiceWindow(null, now)).toBe(false);
    expect(
      withinWhatsAppCustomerServiceWindow('not-a-date', now),
    ).toBe(false);
  });

  it('compares the internal dispatch bearer without accepting partial values', () => {
    expect(verifyInternalBearer('Bearer dispatch-secret', 'dispatch-secret')).toBe(true);
    expect(verifyInternalBearer('Bearer dispatch', 'dispatch-secret')).toBe(false);
    expect(verifyInternalBearer(null, 'dispatch-secret')).toBe(false);
  });
});
