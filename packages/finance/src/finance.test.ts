import { describe, expect, it } from 'vitest';
import { validateBalancedJournal, validateJournalLine } from './index';

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
});
