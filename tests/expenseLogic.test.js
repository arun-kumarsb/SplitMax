import { describe, it, expect } from 'vitest';
import {
  calculateSplits,
  simplifyDebts,
  calculateNetBalances,
  calculateBilateralDebts,
  sanitizeCsvCell,
  validateAmount,
  toPaise,
  toRupees,
} from '../src/utils/expenseLogic.js';

describe('Split Methods & Paise Rounding Math', () => {
  it('splits 0.05 (5 paise) equally among 3 participants with exact sum', () => {
    const result = calculateSplits({
      totalAmount: 0.05,
      splitMethod: 'equal',
      selectedMemberIds: ['alice', 'bob', 'charlie'],
    });

    expect(result.isValid).toBe(true);
    const shares = Object.values(result.owedPaise);
    const total = shares.reduce((a, b) => a + b, 0);

    expect(total).toBe(5); // 5 paise
    expect(result.owedPaise['alice']).toBe(2);
    expect(result.owedPaise['bob']).toBe(2);
    expect(result.owedPaise['charlie']).toBe(1);
  });

  it('splits exact amounts and verifies exact balance match', () => {
    const result = calculateSplits({
      totalAmount: 120,
      splitMethod: 'exact',
      selectedMemberIds: ['alice', 'bob'],
      exactValues: { alice: 70, bob: 50 },
    });
    expect(result.isValid).toBe(true);
    expect(result.remainingPaise).toBe(0);
    expect(result.owedPaise['alice']).toBe(7000);
    expect(result.owedPaise['bob']).toBe(5000);
  });

  it('validates percentages split adding to 100%', () => {
    const result = calculateSplits({
      totalAmount: 300,
      splitMethod: 'percentage',
      selectedMemberIds: ['alice', 'bob'],
      percentageValues: { alice: 33.3, bob: 66.7 },
    });
    expect(result.isValid).toBe(true);
    const total = Object.values(result.owedPaise).reduce((a, b) => a + b, 0);
    expect(total).toBe(30000);
  });

  it('splits by integer shares and avoids paise leaks', () => {
    const result = calculateSplits({
      totalAmount: 100,
      splitMethod: 'shares',
      selectedMemberIds: ['alice', 'bob', 'charlie'],
      shareValues: { alice: 2, bob: 1, charlie: 1 },
    });
    expect(result.isValid).toBe(true);
    const total = Object.values(result.owedPaise).reduce((a, b) => a + b, 0);
    expect(total).toBe(10000); // 100.00
    expect(result.owedPaise['alice']).toBe(5000);
    expect(result.owedPaise['bob']).toBe(2500);
    expect(result.owedPaise['charlie']).toBe(2500);
  });
});

describe('Simplify Debts (Greedy Net-Balance Matching)', () => {
  it('collapses circular and chain debts so all net balances reach zero', () => {
    // Net: Alice owes 30, Bob owes 70, Charlie gets back 100
    const net = { alice: -30, bob: -70, charlie: 100 };
    const transactions = simplifyDebts(net);

    expect(transactions.length).toBe(2);
    const totalSettled = transactions.reduce((sum, t) => sum + t.amount, 0);
    expect(totalSettled).toBe(100);

    // Verify all nets are cleared
    const testNet = { alice: -30, bob: -70, charlie: 100 };
    transactions.forEach((t) => {
      testNet[t.from] += t.amount;
      testNet[t.to] -= t.amount;
    });
    expect(Math.abs(testNet.alice)).toBeLessThan(0.01);
    expect(Math.abs(testNet.bob)).toBeLessThan(0.01);
    expect(Math.abs(testNet.charlie)).toBeLessThan(0.01);
  });
});

describe('CSV Formula Injection Prevention', () => {
  it('escapes initial =, +, -, @, tab, and CR characters', () => {
    expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe(`"'=SUM(A1:A10)"`);
    expect(sanitizeCsvCell('+123')).toBe(`"'+123"`);
    expect(sanitizeCsvCell('-50')).toBe(`"'-50"`);
    expect(sanitizeCsvCell('@cmd')).toBe(`"'@cmd"`);
    expect(sanitizeCsvCell('\tsecret')).toBe(`"'\tsecret"`);
    expect(sanitizeCsvCell('\rhidden')).toBe(`"'\rhidden"`);
  });

  it('escapes internal quotes properly', () => {
    expect(sanitizeCsvCell('Dinner at "Goa" Shack')).toBe(`"Dinner at ""Goa"" Shack"`);
  });
});

describe('Amount Cap and Precision Rules', () => {
  it('accepts valid amounts up to 1,00,00,000 with up to 2 decimal places', () => {
    expect(validateAmount(100).isValid).toBe(true);
    expect(validateAmount(99.99).isValid).toBe(true);
    expect(validateAmount(10000000).isValid).toBe(true); // ₹1,00,00,000
  });

  it('rejects amounts exceeding cap, 0, or more than 2 decimal places', () => {
    expect(validateAmount(0).isValid).toBe(false);
    expect(validateAmount(-5).isValid).toBe(false);
    expect(validateAmount(10000000.01).isValid).toBe(false); // over cap
    expect(validateAmount(999999999999).isValid).toBe(false);
    expect(validateAmount(10.555).isValid).toBe(false); // 3 decimals
  });
});
