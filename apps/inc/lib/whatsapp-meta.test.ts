import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  normalizeMetaWebhook,
  normalizeWhatsAppAddress,
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignature,
} from './whatsapp-meta';

describe('Meta WhatsApp webhook contract', () => {
  it('verifies the GET subscription challenge without accepting a wrong token', () => {
    expect(verifyMetaWebhookChallenge('subscribe', 'expected', 'expected')).toBe(true);
    expect(verifyMetaWebhookChallenge('subscribe', 'wrong', 'expected')).toBe(false);
    expect(verifyMetaWebhookChallenge('unsubscribe', 'expected', 'expected')).toBe(false);
  });

  it('verifies x-hub-signature-256 over the exact raw body', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const secret = 'test-app-secret';
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

    expect(verifyMetaWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyMetaWebhookSignature(`${body} `, signature, secret)).toBe(false);
    expect(verifyMetaWebhookSignature(body, 'sha256=deadbeef', secret)).toBe(false);
    expect(verifyMetaWebhookSignature(body, null, secret)).toBe(false);
  });

  it('normalizes phone addresses to a canonical plus-prefixed digit form', () => {
    expect(normalizeWhatsAppAddress('1 (978) 555-0100')).toBe('+19785550100');
    expect(normalizeWhatsAppAddress('+55 11 99999-0000')).toBe('+5511999990000');
  });

  it('minimizes inbound text and delivery status events without persisting the raw webhook', () => {
    const events = normalizeMetaWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '123456789' },
                contacts: [
                  { wa_id: '19785550100', profile: { name: 'Test Contact' } },
                ],
                messages: [
                  {
                    from: '19785550100',
                    id: 'wamid.inbound-1',
                    timestamp: '1787745600',
                    type: 'text',
                    text: { body: 'Hello KSP' },
                  },
                ],
                statuses: [
                  {
                    id: 'wamid.outbound-1',
                    recipient_id: '19785550100',
                    timestamp: '1787745601',
                    status: 'delivered',
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: 'message',
      phoneNumberId: '123456789',
      providerMessageId: 'wamid.inbound-1',
      from: '+19785550100',
      displayName: 'Test Contact',
      eventType: 'message',
      body: 'Hello KSP',
      metadata: { message_type: 'text' },
    });
    expect(events[1]).toMatchObject({
      kind: 'status',
      phoneNumberId: '123456789',
      providerMessageId: 'wamid.outbound-1',
      recipient: '+19785550100',
      status: 'delivered',
    });
    expect(JSON.stringify(events)).not.toContain('contacts');
    expect(JSON.stringify(events)).not.toContain('entry');
  });

  it('treats media as attachments and stores only provider references and minimal metadata', () => {
    const [event] = normalizeMetaWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '123456789' },
                messages: [
                  {
                    from: '19785550100',
                    id: 'wamid.image-1',
                    timestamp: '1787745600',
                    type: 'image',
                    image: {
                      id: 'media-1',
                      mime_type: 'image/jpeg',
                      caption: 'jobsite photo',
                      sha256: 'do-not-copy-provider-payload',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(event).toMatchObject({
      kind: 'message',
      eventType: 'attachment',
      body: 'jobsite photo',
      metadata: {
        message_type: 'image',
        provider_media_id: 'media-1',
        mime_type: 'image/jpeg',
      },
    });
    expect(JSON.stringify(event)).not.toContain('do-not-copy-provider-payload');
  });
});
