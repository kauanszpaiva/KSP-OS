import { describe, expect, it } from 'vitest';
import { validateBalancedJournal, validateJournalLine, validateInvoice } from './index';

describe('finance package invariants', () => {
  it('requires exactly one positive side per journal line', () => {
    expect(() => validateJournalLine({ accountId: 'a', debitMinor: 0, creditMinor: 0, currency: 'USD' })).toThrow('journal_line_requires_exactly_one_positive_side');
    expect(() => validateJournalLine({ accountId: 'a', debitMinor: 10, creditMinor: 5, currency: 'USD' })).toThrow('journal_line_requires_exactly_one_positive_side');
    expect(() => validateJournalLine({ accountId: 'a', debitMinor: 10, creditMinor: 0, currency: 'USD' })).not.toThrow();
  });

  it('requires balanced single-currency journals', () => {
    expect(() => validateBalancedJournal([{ accountId: 'cash', debitMinor: 100, creditMinor: 0, currency: 'USD' }, { accountId: 'revenue', debitMinor: 0, creditMinor: 100, currency: 'USD' }])).not.toThrow();
    expect(() => validateBalancedJournal([{ accountId: 'cash', debitMinor: 100, creditMinor: 0, currency: 'USD' }, { accountId: 'revenue', debitMinor: 0, creditMinor: 50, currency: 'USD' }])).toThrow('journal_entry_must_balance');
  });

  it('requires invoice amount to equal sum of lines', () => {
    expect(() => validateInvoice({ amountMinor: 100, balanceMinor: 100, lines: [{ amountMinor: 50 }, { amountMinor: 50 }] })).not.toThrow();
    expect(() => validateInvoice({ amountMinor: 100, balanceMinor: 100, lines: [{ amountMinor: 60 }, { amountMinor: 50 }] })).toThrow('invoice_amount_must_equal_lines_total');
  });

  it('requires invoice balance to not exceed amount', () => {
    expect(() => validateInvoice({ amountMinor: 100, balanceMinor: 50, lines: [{ amountMinor: 100 }] })).not.toThrow();
    expect(() => validateInvoice({ amountMinor: 100, balanceMinor: 150, lines: [{ amountMinor: 100 }] })).toThrow('invoice_balance_cannot_exceed_amount');
  });
});
