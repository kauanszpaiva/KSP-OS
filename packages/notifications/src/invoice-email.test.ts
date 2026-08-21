import { describe, expect, it } from 'vitest';
import { buildInvoiceEmail } from './invoice-email';

describe('buildInvoiceEmail', () => {
  it('renders invoice details with the KSP visual identity', () => {
    const email = buildInvoiceEmail({
      to: 'client@example.com',
      clientName: 'Acme Builders',
      invoiceNumber: 'KSP-20260821-ABC12345',
      amountMinor: 125050,
      currency: 'USD',
      dueDate: '2026-09-05',
      lines: [
        { description: 'Website milestone', amountMinor: 100000 },
        { description: 'Hosting setup', amountMinor: 25050 }
      ],
      invoiceUrl: 'https://portal.example.com/invoices/123'
    });

    expect(email.subject).toContain('KSP-20260821-ABC12345');
    expect(email.text).toContain('$1,250.50');
    expect(email.text).toContain('Website milestone');
    expect(email.text).toContain('Kauan Paiva');
    expect(email.html).toContain('2026-09-05');
    expect(email.html).toContain('https://portal.example.com/invoices/123');
    expect(email.html).toContain('https://www.kspdominion.group/assets/logo-circle.png');
    expect(email.html).toContain('#8B2FC9');
    expect(email.html).toContain('#7AB314');
    expect(email.html).toContain('Founder &amp; Operator · KSP Dominion Group');
    expect(email.html).toContain('KSP OS · Finance · Client Portal');
  });

  it('escapes client-controlled html', () => {
    const email = buildInvoiceEmail({
      to: 'client@example.com',
      clientName: '<script>alert(1)</script>',
      invoiceNumber: 'INV-1',
      amountMinor: 100,
      currency: 'USD',
      dueDate: null,
      lines: [{ description: '<img src=x onerror=alert(1)>', amountMinor: 100 }]
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<img src=x');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
