import { describe, expect, it } from 'vitest';
import { assertStatementReconciles, calculateBookBalance, signedCashAmount, validateBalancedJournal, validateCashTransaction, validateJournalLine, validateInvoice } from './index';

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

  it('requires positive exact minor units for cash activity', () => {
    expect(() => validateCashTransaction({ amountMinor: 1250, currency: 'USD', direction: 'outflow' })).not.toThrow();
    expect(() => validateCashTransaction({ amountMinor: 0, currency: 'USD', direction: 'outflow' })).toThrow('cash_amount_must_be_positive_minor_units');
    expect(() => validateCashTransaction({ amountMinor: 10.5, currency: 'USD', direction: 'inflow' })).toThrow('cash_amount_must_be_positive_minor_units');
  });

  it('signs inflows and outflows deterministically', () => {
    expect(signedCashAmount({ amountMinor: 500, currency: 'USD', direction: 'inflow' })).toBe(500);
    expect(signedCashAmount({ amountMinor: 500, currency: 'USD', direction: 'outflow' })).toBe(-500);
  });

  it('never turns an unknown opening balance into zero', () => {
    expect(calculateBookBalance(null, [{ amountMinor: 500, currency: 'USD', direction: 'inflow' }])).toBeNull();
  });

  it('calculates book balance from verified opening balance plus activity', () => {
    expect(calculateBookBalance(10_000, [
      { amountMinor: 2_500, currency: 'USD', direction: 'inflow' },
      { amountMinor: 1_000, currency: 'USD', direction: 'outflow' }
    ])).toBe(11_500);
  });

  it('reconciles only when statement ending balance exactly equals book balance', () => {
    const activity = [
      { amountMinor: 2_500, currency: 'USD', direction: 'inflow' as const },
      { amountMinor: 1_000, currency: 'USD', direction: 'outflow' as const }
    ];
    expect(() => assertStatementReconciles(10_000, activity, 11_500)).not.toThrow();
    expect(() => assertStatementReconciles(10_000, activity, 11_499)).toThrow('statement_does_not_reconcile');
    expect(() => assertStatementReconciles(null, activity, 11_500)).toThrow('opening_balance_required_before_reconciliation');
  });
});
