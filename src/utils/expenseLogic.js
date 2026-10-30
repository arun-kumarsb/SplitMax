// Pure Expense, Split, and Debt Simplification Math Utilities
// All monetary math is handled internally in PAISE (integers) to prevent floating-point leaks.

export const MAX_AMOUNT = 10000000; // ₹1,00,00,000 cap
export const MAX_PAISE = 1000000000n; // 1,000,000,000 paise

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Validate monetary amount:
 * - Must be greater than 0
 * - Cannot exceed ₹1,00,00,000 (10,000,000)
 * - Maximum 2 decimal places
 */
export function validateAmount(val) {
  if (val === undefined || val === null || val === '') {
    return { isValid: false, error: 'Amount is required.' };
  }
  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0.' };
  }
  if (num > MAX_AMOUNT) {
    return { isValid: false, error: 'Amount cannot exceed ₹1,00,00,000.' };
  }
  // Check decimal places
  const str = String(val);
  if (str.includes('.')) {
    const decimals = str.split('.')[1];
    if (decimals && decimals.length > 2) {
      return { isValid: false, error: 'Maximum 2 decimal places allowed.' };
    }
  }
  return { isValid: true, error: null };
}

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
  return Number(paise) / 100;
}

/**
 * Calculate member shares based on split method
 * Guarantees zero-sum and distributes leftover paise one each across participants deterministically!
 * e.g. 0.05 split 3 ways (5 paise) -> 0.02, 0.02, 0.01 (sum = 0.05)
 */
export function calculateSplits({
  totalAmount,
  splitMethod, // 'equal' | 'exact' | 'percentage' | 'shares'
  selectedMemberIds,
  exactValues = {}, // memberId -> entered amount
  percentageValues = {}, // memberId -> entered percentage
  shareValues = {}, // memberId -> entered share count
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

    // Distribute remainder 1 paisa each to the first `remainder` participants deterministically
    for (let i = 0; i < remainder; i++) {
      owedPaise[memberIds[i]] += 1;
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
      // Distribute residual paise from floor rounding 1 each across participants deterministically
      const remainder = totalPaise - sumAllocatedPaise;
      for (let i = 0; i < remainder; i++) {
        const target = memberIds[i % memberIds.length];
        owedPaise[target] += 1;
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

    // Distribute residual paise 1 each across participants deterministically
    const remainder = totalPaise - sumAllocated;
    for (let i = 0; i < remainder; i++) {
      const target = memberIds[i % memberIds.length];
      owedPaise[target] += 1;
    }

    return { owedPaise, isValid: true, remainingPaise: 0, error: null };
  }

  return { owedPaise: {}, isValid: false, remainingPaise: totalPaise, error: 'Unknown split method' };
}

/**
 * Calculates net balance for every member in the group
 * Net = Total Paid - Total Owed
 * Returns map of memberId -> net amount in rupees (computed from paise)
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
  const groupCurrency = group.currency || 'INR';
  const totalSpend = group.expenses?.reduce((acc, e) => acc + Number(e.amount || 0), 0) || 0;

  let text = `⚡ *SPLIT//MAX EXPENSE SUMMARY* ⚡\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📁 *Group:* ${group.emoji} ${group.name}\n`;
  text += `💰 *Total Group Spend:* ${formatCurrency(totalSpend, groupCurrency)}\n`;
  text += `📅 *Generated On:* ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;

  text += `📊 *NET MEMBER BALANCES:*\n`;
  members.forEach((m) => {
    const net = netBalances[m.id] || 0;
    if (net > 0) {
      text += `• ${m.name}: Gets back ${formatCurrency(net, groupCurrency)} 🟢\n`;
    } else if (net < 0) {
      text += `• ${m.name}: Owes ${formatCurrency(Math.abs(net), groupCurrency)} 🔴\n`;
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
      text += `👉 *${fromName}* pays *${toName}* ${formatCurrency(t.amount, groupCurrency)}\n`;
    });
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Created with SPLIT//MAX ⚡ No debts left behind!`;

  return text;
}

/**
 * Sanitize CSV cell against formula injection and quote properly
 * If starting with =, +, -, @, \t, or \r, prefix with single quote '
 */
export function sanitizeCsvCell(value) {
  let str = String(value ?? '');
  // Prefix dangerous initial characters with single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // Escape double quotes
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Export expenses & settlements as CSV string
 * Sanitizes formula injection and exports amounts from paise correctly
 */
export function generateCSV(group, members) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const groupCurrency = group.currency || 'INR';

  const headers = ['Type', 'Date', 'Description', 'Category', 'Amount', 'Currency', 'Paid By', 'Split Method', 'Participants'];
  const rows = [];

  // Expenses
  (group.expenses || []).forEach((e) => {
    const amountVal = e.amount_paise ? toRupees(e.amount_paise) : Number(e.amount || 0);

    const paidBy = e.isMultiPayer
      ? Object.entries(e.payers || {})
          .map(([id, amt]) => `${memberMap[id] || id}: ${amt}`)
          .join('; ')
      : memberMap[e.paidBy] || e.paidBy;

    const participants = Object.keys(e.splits || {})
      .map((id) => memberMap[id] || id)
      .join(', ');

    rows.push([
      sanitizeCsvCell('Expense'),
      sanitizeCsvCell(e.date || ''),
      sanitizeCsvCell(e.description || ''),
      sanitizeCsvCell(e.category || 'General'),
      sanitizeCsvCell(amountVal.toFixed(2)),
      sanitizeCsvCell(groupCurrency),
      sanitizeCsvCell(paidBy),
      sanitizeCsvCell(e.splitMethod || 'equal'),
      sanitizeCsvCell(participants),
    ]);
  });

  // Settlements
  (group.settlements || []).forEach((s) => {
    const amountVal = s.amount_paise ? toRupees(s.amount_paise) : Number(s.amount || 0);

    rows.push([
      sanitizeCsvCell('Settlement'),
      sanitizeCsvCell(s.date || ''),
      sanitizeCsvCell(`Payment from ${memberMap[s.from] || s.from} to ${memberMap[s.to] || s.to}`),
      sanitizeCsvCell('Settlement'),
      sanitizeCsvCell(amountVal.toFixed(2)),
      sanitizeCsvCell(groupCurrency),
      sanitizeCsvCell(memberMap[s.from] || s.from),
      sanitizeCsvCell('Direct'),
      sanitizeCsvCell(memberMap[s.to] || s.to),
    ]);
  });

  return [headers.map(sanitizeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Unit Test / Sanity Check Suite
 */
export function runSanityChecks() {
  const results = [];

  // 1. Equal Split Check with 0.05 / 3 (5 paise split 3 ways)
  // Must distribute 2, 2, 1 paise deterministically -> sum = 5 paise (0.05)
  const oddSplit = calculateSplits({
    totalAmount: 0.05,
    splitMethod: 'equal',
    selectedMemberIds: ['m1', 'm2', 'm3'],
  });
  const sumOdd = Object.values(oddSplit.owedPaise).reduce((a, b) => a + b, 0);
  results.push({
    test: 'Equal Split 0.05 (5 paise) split 3 ways yields 2, 2, 1 paise summing exactly to 5 paise',
    passed: sumOdd === 5 && oddSplit.owedPaise['m1'] === 2 && oddSplit.owedPaise['m2'] === 2 && oddSplit.owedPaise['m3'] === 1,
  });

  // 2. Exact Amounts Check
  const exactSplit = calculateSplits({
    totalAmount: 250,
    splitMethod: 'exact',
    selectedMemberIds: ['m1', 'm2'],
    exactValues: { m1: 150, m2: 100 },
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
  });
  results.push({
    test: 'Percentage Split 60% / 40% on ₹500 produces 30000 and 20000 paise',
    passed: pctSplit.isValid && pctSplit.owedPaise['m1'] === 30000 && pctSplit.owedPaise['m2'] === 20000,
  });

  // 4. Shares Split Check
  const sharesSplit = calculateSplits({
    totalAmount: 100,
    splitMethod: 'shares',
    selectedMemberIds: ['m1', 'm2'],
    shareValues: { m1: 2, m2: 1 },
  });
  const sumShares = Object.values(sharesSplit.owedPaise).reduce((a, b) => a + b, 0);
  results.push({
    test: 'Shares Split 2 shares vs 1 share on ₹100 produces exact zero-loss sum (10000 paise)',
    passed: sumShares === 10000 && sharesSplit.owedPaise['m1'] === 6667 && sharesSplit.owedPaise['m2'] === 3333,
  });

  // 5. Greedy Debt Minimization
  const simplified = simplifyDebts({ A: -100, B: -50, C: 150 });
  results.push({
    test: 'Simplify Debts: 2 debtors (100, 50) and 1 creditor (150) resolves in exactly 2 payments',
    passed: simplified.length === 2 && simplified.reduce((sum, t) => sum + t.amount, 0) === 150,
  });

  // 6. CSV Formula Injection escaping
  const safeCell1 = sanitizeCsvCell('=1+1');
  const safeCell2 = sanitizeCsvCell('-cmd|calc');
  const safeCell3 = sanitizeCsvCell('Normal "Hello"');
  results.push({
    test: 'CSV injection protection prefixes =, -, +, @ with single quote and escapes quotes',
    passed: safeCell1 === `"'=1+1"` && safeCell2 === `"'-cmd|calc"` && safeCell3 === `"Normal ""Hello"""`,
  });

  // 7. Amount validation cap
  const capTest1 = validateAmount(10000000); // 1 crore
  const capTest2 = validateAmount(10000000.01); // over cap
  const capTest3 = validateAmount(10.555); // 3 decimals
  results.push({
    test: 'Amount cap enforces ₹1,00,00,000 maximum and at most 2 decimal places',
    passed: capTest1.isValid && !capTest2.isValid && !capTest3.isValid,
  });

  return results;
}
