// Pure Expense, Split, and Debt Simplification Math Utilities
// All monetary math is handled internally in PAISE (integers) to prevent floating-point leaks.

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Format paise or float to formatted currency string
 * e.g., 45000 paise -> ₹450.00 or ₹450
 */
export function formatCurrency(amount, currency = 'INR', showDecimals = false) {
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const val = Number(amount) || 0;
  if (showDecimals || val % 1 !== 0) {
    return `${symbol}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${symbol}${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Converts a rupee float/number to integer paise
 */
export function toPaise(rupees) {
  return Math.round((Number(rupees) || 0) * 100);
}

/**
 * Converts integer paise to rupee float
 */
export function toRupees(paise) {
  return paise / 100;
}

/**
 * Calculate member shares based on split method
 * Guarantees zero-sum and assigns remaining paise to primary payer/first participant
 */
export function calculateSplits({
  totalAmount,
  splitMethod, // 'equal' | 'exact' | 'percentage' | 'shares'
  selectedMemberIds,
  exactValues = {}, // memberId -> entered amount
  percentageValues = {}, // memberId -> entered percentage
  shareValues = {}, // memberId -> entered share count
  payerId,
}) {
  const totalPaise = toPaise(totalAmount);
  const memberIds = selectedMemberIds || [];

  if (memberIds.length === 0 || totalPaise <= 0) {
    return { owedPaise: {}, isValid: false, remainingPaise: totalPaise, error: 'Select at least one participant.' };
  }

  const owedPaise = {};

  if (splitMethod === 'equal') {
    const count = memberIds.length;
    const baseShare = Math.floor(totalPaise / count);
    const remainder = totalPaise - baseShare * count;

    // Allocate base shares
    memberIds.forEach((id) => {
      owedPaise[id] = baseShare;
    });

    // Payer (if in participants) or the first participant absorbs the remainder paise
    const remainderRecipient = memberIds.includes(payerId) ? payerId : memberIds[0];
    if (remainderRecipient) {
      owedPaise[remainderRecipient] += remainder;
    }

    return { owedPaise, isValid: true, remainingPaise: 0, error: null };
  }

  if (splitMethod === 'exact') {
    let sumPaise = 0;
    memberIds.forEach((id) => {
      const p = toPaise(exactValues[id] || 0);
      owedPaise[id] = p;
      sumPaise += p;
    });

    const diff = totalPaise - sumPaise;
    const isValid = diff === 0;
    const error = diff !== 0 ? `Amounts do not match total. Difference: ${toRupees(diff)}` : null;

    return { owedPaise, isValid, remainingPaise: diff, error };
  }

  if (splitMethod === 'percentage') {
    let totalPct = 0;
    memberIds.forEach((id) => {
      totalPct += Number(percentageValues[id] || 0);
    });

    const isPctValid = Math.abs(totalPct - 100) < 0.01;
    let sumAllocatedPaise = 0;

    memberIds.forEach((id) => {
      const pct = Number(percentageValues[id] || 0);
      const share = Math.floor((totalPaise * pct) / 100);
      owedPaise[id] = share;
      sumAllocatedPaise += share;
    });

    if (isPctValid) {
      // Assign residual paise from floor rounding
      const remainder = totalPaise - sumAllocatedPaise;
      const target = memberIds.includes(payerId) ? payerId : memberIds[0];
      if (target) {
        owedPaise[target] += remainder;
      }
    }

    return {
      owedPaise,
      isValid: isPctValid,
      remainingPaise: isPctValid ? 0 : totalPaise - sumAllocatedPaise,
      error: !isPctValid ? `Percentages must add up to 100%. Currently: ${totalPct.toFixed(1)}%` : null,
    };
  }

  if (splitMethod === 'shares') {
    let totalShares = 0;
    memberIds.forEach((id) => {
      totalShares += Math.max(0, Number(shareValues[id] || 0));
    });

    if (totalShares <= 0) {
      return { owedPaise: {}, isValid: false, remainingPaise: totalPaise, error: 'Total shares must be greater than 0.' };
    }

    let sumAllocated = 0;
    memberIds.forEach((id) => {
      const s = Math.max(0, Number(shareValues[id] || 0));
      const share = Math.floor((totalPaise * s) / totalShares);
      owedPaise[id] = share;
      sumAllocated += share;
    });

    // Assign residual paise from rounding
    const remainder = totalPaise - sumAllocated;
    const target = memberIds.includes(payerId) ? payerId : memberIds[0];
    if (target) {
      owedPaise[target] += remainder;
    }

    return { owedPaise, isValid: true, remainingPaise: 0, error: null };
  }

  return { owedPaise: {}, isValid: false, remainingPaise: totalPaise, error: 'Unknown split method' };
}

/**
 * Calculates net balance for every member in the group
 * Net = Total Paid - Total Owed
 * Returns map of memberId -> net amount in rupees
 */
export function calculateNetBalances(members = [], expenses = [], settlements = []) {
  const netPaiseMap = {};
  members.forEach((m) => {
    netPaiseMap[m.id] = 0;
  });

  // Process Expenses
  expenses.forEach((expense) => {
    // 1. Credit payers
    if (expense.isMultiPayer && expense.payers) {
      Object.entries(expense.payers).forEach(([payerId, amount]) => {
        if (netPaiseMap[payerId] !== undefined) {
          netPaiseMap[payerId] += toPaise(amount);
        }
      });
    } else if (expense.paidBy) {
      if (netPaiseMap[expense.paidBy] !== undefined) {
        netPaiseMap[expense.paidBy] += toPaise(expense.amount);
      }
    }

    // 2. Debit debtors
    if (expense.splits) {
      Object.entries(expense.splits).forEach(([debtorId, amount]) => {
        if (netPaiseMap[debtorId] !== undefined) {
          netPaiseMap[debtorId] -= toPaise(amount);
        }
      });
    }
  });

  // Process Settlements (payer pays receiver)
  settlements.forEach((st) => {
    const paise = toPaise(st.amount);
    if (netPaiseMap[st.from] !== undefined) {
      netPaiseMap[st.from] += paise; // Payer debt reduced / net increased
    }
    if (netPaiseMap[st.to] !== undefined) {
      netPaiseMap[st.to] -= paise; // Receiver received money / net decreased
    }
  });

  // Convert to rupees
  const netRupeesMap = {};
  Object.entries(netPaiseMap).forEach(([id, paise]) => {
    netRupeesMap[id] = toRupees(paise);
  });

  return netRupeesMap;
}

/**
 * Greedy Net-Balance Matching Algorithm (Simplify Debts)
 * Minimizes total number of transactions required to settle all debts.
 * @param {Object} netBalancesMap - memberId -> net amount in Rupees
 * @returns {Array} simplifiedTransactions - [{ from, to, amount }]
 */
export function simplifyDebts(netBalancesMap) {
  // Convert to paise for strict integer arithmetic
  const debtors = []; // owes money (net < 0)
  const creditors = []; // gets back money (net > 0)

  Object.entries(netBalancesMap).forEach(([id, amount]) => {
    const paise = Math.round(amount * 100);
    if (paise < -1) {
      debtors.push({ id, net: paise });
    } else if (paise > 1) {
      creditors.push({ id, net: paise });
    }
  });

  const transactions = [];

  while (debtors.length > 0 && creditors.length > 0) {
    // Sort debtors by largest debt first (most negative)
    debtors.sort((a, b) => a.net - b.net);
    // Sort creditors by largest credit first (most positive)
    creditors.sort((a, b) => b.net - a.net);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const settlePaise = Math.min(-debtor.net, creditor.net);

    transactions.push({
      from: debtor.id,
      to: creditor.id,
      amount: settlePaise / 100,
    });

    debtor.net += settlePaise;
    creditor.net -= settlePaise;

    if (Math.abs(debtor.net) <= 1) {
      debtors.shift();
    }
    if (Math.abs(creditor.net) <= 1) {
      creditors.shift();
    }
  }

  return transactions;
}

/**
 * Calculates raw pairwise bilateral balances
 * (Who owes whom directly without global graph simplification)
 */
export function calculateBilateralDebts(members = [], expenses = [], settlements = []) {
  // debtMatrix[A][B] = amount A owes B directly in paise
  const matrix = {};
  members.forEach((m1) => {
    matrix[m1.id] = {};
    members.forEach((m2) => {
      matrix[m1.id][m2.id] = 0;
    });
  });

  expenses.forEach((expense) => {
    // For single payer
    if (!expense.isMultiPayer && expense.paidBy && expense.splits) {
      const payerId = expense.paidBy;
      Object.entries(expense.splits).forEach(([debtorId, shareAmount]) => {
        if (debtorId !== payerId && matrix[debtorId] && matrix[debtorId][payerId] !== undefined) {
          matrix[debtorId][payerId] += toPaise(shareAmount);
        }
      });
    } else if (expense.isMultiPayer && expense.payers && expense.splits) {
      // Proportional bilateral distribution for multi-payers
      const totalPaise = toPaise(expense.amount);
      if (totalPaise > 0) {
        Object.entries(expense.splits).forEach(([debtorId, shareAmount]) => {
          const debtorPaise = toPaise(shareAmount);
          Object.entries(expense.payers).forEach(([payerId, payerPaid]) => {
            if (debtorId !== payerId && matrix[debtorId] && matrix[debtorId][payerId] !== undefined) {
              const payerPortion = (toPaise(payerPaid) / totalPaise);
              matrix[debtorId][payerId] += Math.round(debtorPaise * payerPortion);
            }
          });
        });
      }
    }
  });

  // Apply settlements directly to bilateral debts
  settlements.forEach((st) => {
    const paise = toPaise(st.amount);
    if (matrix[st.from] && matrix[st.from][st.to] !== undefined) {
      matrix[st.from][st.to] -= paise;
    }
  });

  // Net out bilateral pairs (if A owes B 50 and B owes A 20 -> A owes B 30)
  const results = [];
  const processed = new Set();

  members.forEach((m1) => {
    members.forEach((m2) => {
      if (m1.id !== m2.id) {
        const pairKey = [m1.id, m2.id].sort().join(':');
        if (!processed.has(pairKey)) {
          processed.add(pairKey);
          const aOwesB = matrix[m1.id][m2.id] || 0;
          const bOwesA = matrix[m2.id][m1.id] || 0;
          const net = aOwesB - bOwesA;

          if (net > 50) {
            // m1 owes m2
            results.push({
              from: m1.id,
              to: m2.id,
              amount: toRupees(net),
            });
          } else if (net < -50) {
            // m2 owes m1
            results.push({
              from: m2.id,
              to: m1.id,
              amount: toRupees(-net),
            });
          }
        }
      }
    });
  });

  return results;
}

/**
 * Format balance summary as formatted WhatsApp text
 */
export function formatWhatsAppSummary(group, members, netBalances, simplifiedTransactions) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const totalSpend = group.expenses?.reduce((acc, e) => acc + Number(e.amount || 0), 0) || 0;

  let text = `⚡ *SPLIT//MAX EXPENSE SUMMARY* ⚡\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📁 *Group:* ${group.emoji} ${group.name}\n`;
  text += `💰 *Total Group Spend:* ₹${totalSpend.toLocaleString('en-IN')}\n`;
  text += `📅 *Generated On:* ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;

  text += `📊 *NET MEMBER BALANCES:*\n`;
  members.forEach((m) => {
    const net = netBalances[m.id] || 0;
    if (net > 0) {
      text += `• ${m.name}: Gets back ₹${net.toLocaleString('en-IN', { minimumFractionDigits: 0 })} 🟢\n`;
    } else if (net < 0) {
      text += `• ${m.name}: Owes ₹${Math.abs(net).toLocaleString('en-IN', { minimumFractionDigits: 0 })} 🔴\n`;
    } else {
      text += `• ${m.name}: Settled up ✨\n`;
    }
  });

  text += `\n🚀 *MINIMAL SETTLEMENT INSTRUCTIONS:*\n`;
  if (simplifiedTransactions.length === 0) {
    text += `🎉 All settled up! No one owes anyone anything.\n`;
  } else {
    simplifiedTransactions.forEach((t) => {
      const fromName = memberMap[t.from]?.name || 'Someone';
      const toName = memberMap[t.to]?.name || 'Someone';
      text += `👉 *${fromName}* pays *${toName}* ₹${t.amount.toLocaleString('en-IN')}\n`;
    });
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Created with SPLIT//MAX ⚡ No debts left behind!`;

  return text;
}

/**
 * Export expenses & settlements as CSV string
 */
export function generateCSV(group, members) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));

  const headers = ['Type', 'Date', 'Description', 'Category', 'Amount', 'Currency', 'Paid By', 'Split Method', 'Participants'];
  const rows = [];

  // Expenses
  (group.expenses || []).forEach((e) => {
    const paidBy = e.isMultiPayer
      ? Object.entries(e.payers || {})
          .map(([id, amt]) => `${memberMap[id] || id}: ${amt}`)
          .join('; ')
      : memberMap[e.paidBy] || e.paidBy;

    const participants = Object.keys(e.splits || {})
      .map((id) => memberMap[id] || id)
      .join(', ');

    rows.push([
      'Expense',
      e.date || '',
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.category || 'General',
      e.amount || 0,
      e.currency || 'INR',
      `"${paidBy}"`,
      e.splitMethod || 'equal',
      `"${participants}"`,
    ]);
  });

  // Settlements
  (group.settlements || []).forEach((s) => {
    rows.push([
      'Settlement',
      s.date || '',
      `"Payment from ${memberMap[s.from] || s.from} to ${memberMap[s.to] || s.to}"`,
      'Settlement',
      s.amount || 0,
      'INR',
      `"${memberMap[s.from] || s.from}"`,
      'Direct',
      `"${memberMap[s.to] || s.to}"`,
    ]);
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Unit Test / Sanity Check Suite
 * Run to guarantee calculation correctness.
 */
export function runSanityChecks() {
  const results = [];

  // 1. Equal Split Check with 100 / 3
  const equalSplit = calculateSplits({
    totalAmount: 100,
    splitMethod: 'equal',
    selectedMemberIds: ['m1', 'm2', 'm3'],
    payerId: 'm1',
  });
  const sumEqual = Object.values(equalSplit.owedPaise).reduce((a, b) => a + b, 0);
  results.push({
    test: 'Equal Split ₹100 among 3 participants retains all 10,000 paise',
    passed: sumEqual === 10000 && equalSplit.owedPaise['m1'] === 3334 && equalSplit.owedPaise['m2'] === 3333,
  });

  // 2. Exact Amounts Check
  const exactSplit = calculateSplits({
    totalAmount: 250,
    splitMethod: 'exact',
    selectedMemberIds: ['m1', 'm2'],
    exactValues: { m1: 150, m2: 100 },
    payerId: 'm1',
  });
  results.push({
    test: 'Exact Split ₹250 (₹150 + ₹100) validates successfully',
    passed: exactSplit.isValid && exactSplit.remainingPaise === 0,
  });

  // 3. Percentage Split Check
  const pctSplit = calculateSplits({
    totalAmount: 500,
    splitMethod: 'percentage',
    selectedMemberIds: ['m1', 'm2'],
    percentageValues: { m1: 60, m2: 40 },
    payerId: 'm1',
  });
  results.push({
    test: 'Percentage Split 60% / 40% on ₹500 produces ₹300 and ₹200',
    passed: pctSplit.isValid && pctSplit.owedPaise['m1'] === 30000 && pctSplit.owedPaise['m2'] === 20000,
  });

  // 4. Greedy Debt Minimization
  // Net: A owes 100, B owes 50, C gets back 150
  const simplified = simplifyDebts({ A: -100, B: -50, C: 150 });
  results.push({
    test: 'Simplify Debts: 2 debtors (100, 50) and 1 creditor (150) resolves in exactly 2 payments',
    passed: simplified.length === 2 && simplified.reduce((sum, t) => sum + t.amount, 0) === 150,
  });

  return results;
}
