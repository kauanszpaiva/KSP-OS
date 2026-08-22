import { describe, expect, it } from 'vitest';
import { defaultFinanceView, FINANCE_VIEWS } from './finance-view-state';

describe('Finance responsive workspace contract', () => {
  it('opens Cash when the released Cash schema is available', () => {
    expect(defaultFinanceView({ cashReady: true, invoiceReady: true })).toBe('cash');
  });

  it('opens Receivables when Cash is unavailable but invoices are released', () => {
    expect(defaultFinanceView({ cashReady: false, invoiceReady: true })).toBe('invoices');
  });

  it('falls back to Subscriptions instead of a broken schema screen', () => {
    expect(defaultFinanceView({ cashReady: false, invoiceReady: false })).toBe('subscriptions');
  });

  it('keeps Receivables first in the mobile finance workspace selector', () => {
    expect(FINANCE_VIEWS[0]).toEqual({ value: 'invoices', label: 'Receivables' });
    expect(new Set(FINANCE_VIEWS.map((item) => item.value)).size).toBe(FINANCE_VIEWS.length);
  });
});
