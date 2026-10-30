import React from 'react';
import { formatCurrency } from '../utils/expenseLogic';

export default function MarqueeTicker({
  totalSpend = 0,
  youOwe = 0,
  youGetBack = 0,
  activeGroupName = '',
  expenseCount = 0,
  groupCurrency = 'INR',
}) {
  const tickerItems = [
    `★ ACTIVE GROUP: ${activeGroupName.toUpperCase()} ★`,
    `★ TOTAL SPEND: ${formatCurrency(totalSpend, groupCurrency)} ★`,
    youOwe > 0.005
      ? `🚨 YOU OWE ${formatCurrency(youOwe, groupCurrency)} — PAY UP OR FACE THE SASS! 💸 ★`
      : `✨ YOU OWE NOTHING! LIVING THE DEBT-FREE LIFE 😎 ★`,
    youGetBack > 0.005
      ? `🤑 YOU ARE OWED ${formatCurrency(youGetBack, groupCurrency)} — TIME TO COLLECT! ★`
      : `★ BALANCED VIBES ONLY ★`,
    `★ ${expenseCount} TOTAL EXPENSES LOGGED ★`,
    `★ SPLIT FAIR, STAY FRIENDS ★`,
    `★ 100% INTEGER PAISE PRECISION (ZERO ROUNDING LEAKS) ★`,
    `★ MAXIMALIST MONEY TRACKING ⚡ ★`,
  ];

  const fullText = [...tickerItems, ...tickerItems].join('   ');

  return (
    <div className="bg-[#FFE600] text-black border-y-3 border-black py-2.5 overflow-hidden select-none font-mono-numbers text-xs sm:text-sm font-bold uppercase tracking-wider relative z-20">
      <div className="flex w-max animate-marquee space-x-4">
        <span>{fullText}</span>
        <span>{fullText}</span>
      </div>
    </div>
  );
}
