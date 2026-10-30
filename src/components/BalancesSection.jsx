import React, { useState } from 'react';
import {
  formatCurrency,
  formatWhatsAppSummary,
  generateCSV,
} from '../utils/expenseLogic';
import {
  Zap,
  ArrowRight,
  Share2,
  Download,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function BalancesSection({
  group,
  members,
  netBalances,
  simplifiedDebts,
  bilateralDebts,
  onOpenSettleWithPrefill,
}) {
  const [useSimplified, setUseSimplified] = useState(true);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const displayTransactions = useSimplified ? simplifiedDebts : bilateralDebts;
  const rawTxCount = bilateralDebts.length;
  const simpTxCount = simplifiedDebts.length;
  const txSaved = Math.max(0, rawTxCount - simpTxCount);

  // WhatsApp copy handler
  const handleCopyWhatsApp = () => {
    sounds.playSuccess();
    const summary = formatWhatsAppSummary(group, members, netBalances, simplifiedDebts);
    navigator.clipboard.writeText(summary);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  // CSV download handler
  const handleDownloadCSV = () => {
    sounds.playSuccess();
    const csvContent = generateCSV(group, members);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${group.name.replace(/[^a-zA-Z0-9]/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-[#161722] border-3 border-black dark:border-white p-4 sm:p-5 rounded-lg brutal-shadow-md my-6 relative">
      {/* Top Banner & Export Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black dark:border-gray-700 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-[#B6FF00] text-black font-display text-sm px-2.5 py-1 border-2 border-black brutal-shadow-sm rotate-1">
            DEBTS // BALANCES
          </span>
          <h2 className="font-heading text-lg sm:text-xl text-black dark:text-white">
            Who Owes Whom
          </h2>
        </div>

        {/* Action Buttons: WhatsApp & CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyWhatsApp}
            className="bg-[#25D366] hover:bg-[#20ba59] text-black font-mono-numbers text-xs font-bold px-3 py-1.5 border-2 border-black brutal-btn brutal-shadow-sm rounded flex items-center gap-1.5"
            title="Copy formatted balance breakdown for WhatsApp"
          >
            {copiedWhatsApp ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>COPIED!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>WHATSAPP SUMMARY</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadCSV}
            className="bg-[#FFE600] hover:bg-[#ffd900] text-black font-mono-numbers text-xs font-bold px-3 py-1.5 border-2 border-black brutal-btn brutal-shadow-sm rounded flex items-center gap-1.5"
            title="Download all transactions as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV EXPORT</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Running Net Balances (Left) & Debt Minimization Flow (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        
        {/* Left Column (5 cols): Member Net Status */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading uppercase text-gray-500 dark:text-gray-400">
              Running Net Totals
            </span>
            <span className="text-[11px] font-mono-numbers text-gray-400">
              Green = Gets Back, Red = Owes
            </span>
          </div>

          <div className="space-y-2">
            {members.map((member) => {
              const net = netBalances[member.id] || 0;
              const isPositive = net > 0.05;
              const isNegative = net < -0.05;

              return (
                <div
                  key={member.id}
                  className={`p-2.5 border-2 border-black rounded flex items-center justify-between transition-all ${
                    isPositive
                      ? 'bg-green-50 dark:bg-[#152718] border-green-900 dark:border-[#B6FF00]'
                      : isNegative
                      ? 'bg-red-50 dark:bg-[#2e151d] border-red-900 dark:border-[#FF2E93]'
                      : 'bg-gray-50 dark:bg-[#1E1F2A]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-sm font-bold shadow-sm"
                      style={{ backgroundColor: member.color || '#FFE600' }}
                    >
                      {member.emoji}
                    </div>
                    <div>
                      <div className="font-heading text-xs sm:text-sm text-black dark:text-white">
                        {member.name}
                      </div>
                      <div className="text-[10px] font-mono-numbers text-gray-500 dark:text-gray-400">
                        {isPositive
                          ? 'gets back'
                          : isNegative
                          ? 'owes group'
                          : 'fully settled'}
                      </div>
                    </div>
                  </div>

                  {/* Net Badge */}
                  <div
                    className={`font-mono-numbers text-sm sm:text-base font-extrabold px-2 py-0.5 border border-black rounded ${
                      isPositive
                        ? 'bg-[#B6FF00] text-black'
                        : isNegative
                        ? 'bg-[#FF2E93] text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {isPositive && '+'}
                    {formatCurrency(net)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 cols): Debt Minimization & Actionable Settlements */}
        <div className="lg:col-span-7 bg-gray-50 dark:bg-[#1A1C28] border-2 border-black p-4 rounded-lg">
          {/* Algorithm Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-white dark:bg-[#12131C] p-2 border-2 border-black rounded">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF7A00]" />
              <span className="text-xs font-heading uppercase text-black dark:text-white">
                Simplify Debts Algorithm
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sounds.playPop();
                  setUseSimplified(true);
                }}
                className={`px-2 py-1 text-xs font-mono-numbers font-bold rounded border ${
                  useSimplified
                    ? 'bg-[#FF7A00] text-black border-black brutal-shadow-sm'
                    : 'border-transparent text-gray-500 dark:text-gray-400'
                }`}
              >
                SIMPLIFIED ({simpTxCount})
              </button>
              <button
                onClick={() => {
                  sounds.playPop();
                  setUseSimplified(false);
                }}
                className={`px-2 py-1 text-xs font-mono-numbers font-bold rounded border ${
                  !useSimplified
                    ? 'bg-[#00F0FF] text-black border-black brutal-shadow-sm'
                    : 'border-transparent text-gray-500 dark:text-gray-400'
                }`}
              >
                RAW DIRECT ({rawTxCount})
              </button>
            </div>
          </div>

          {/* Efficiency Banner */}
          {useSimplified && txSaved > 0 && (
            <div className="mb-4 bg-[#FFE600] text-black border-2 border-black p-2 rounded text-xs font-bold font-mono-numbers flex items-center justify-between brutal-shadow-sm -rotate-0.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF2E93]" />
                Reduced {rawTxCount} bilateral debts down to {simpTxCount}!
              </span>
              <span className="bg-black text-[#FFE600] text-[10px] px-1.5 py-0.5 rounded uppercase">
                {txSaved} fewer payments
              </span>
            </div>
          )}

          {/* Transactions List */}
          {displayTransactions.length === 0 ? (
            <div className="text-center py-8 text-black dark:text-white space-y-2">
              <div className="text-4xl animate-bounce">🎉</div>
              <div className="font-heading text-base">
                ALL SETTLED! ABSOLUTE LEGENDS.
              </div>
              <div className="text-xs font-mono-numbers text-gray-500">
                No outstanding payments needed in this circle.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayTransactions.map((tx, idx) => {
                const fromMember = memberMap[tx.from] || { name: 'Someone', emoji: '👤' };
                const toMember = memberMap[tx.to] || { name: 'Someone', emoji: '👤' };

                return (
                  <div
                    key={`${tx.from}-${tx.to}-${idx}`}
                    className="bg-white dark:bg-[#202230] border-2 border-black p-3 rounded flex flex-wrap items-center justify-between gap-2 hover:bg-yellow-50 dark:hover:bg-[#262a3d] transition-colors"
                  >
                    {/* Direction Flow */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                      <span className="flex items-center gap-1 bg-[#FFE600] text-black px-2 py-0.5 border border-black rounded">
                        <span>{fromMember.emoji}</span>
                        <span>{fromMember.name}</span>
                      </span>

                      <ArrowRight className="w-4 h-4 text-gray-400 animate-pulse" />

                      <span className="flex items-center gap-1 bg-[#B6FF00] text-black px-2 py-0.5 border border-black rounded">
                        <span>{toMember.emoji}</span>
                        <span>{toMember.name}</span>
                      </span>
                    </div>

                    {/* Amount & Settle Button */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono-numbers text-sm sm:text-base font-extrabold text-[#FF2E93]">
                        {formatCurrency(tx.amount)}
                      </span>

                      <button
                        onClick={() => {
                          sounds.playPop();
                          onOpenSettleWithPrefill({
                            from: tx.from,
                            to: tx.to,
                            amount: tx.amount,
                          });
                        }}
                        className="bg-[#00F0FF] hover:bg-[#43f3ff] text-black font-heading text-[11px] px-2.5 py-1 border-2 border-black brutal-btn brutal-shadow-sm rounded uppercase"
                      >
                        Settle Up
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
