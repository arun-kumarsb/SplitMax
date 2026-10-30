import React from 'react';
import { formatCurrency } from '../utils/expenseLogic';
import { TrendingUp, AlertCircle, Sparkles, ReceiptText } from 'lucide-react';

export default function DashboardStats({
  totalGroupSpend,
  userConsumedShare,
  userNetBalance,
  currentMember,
  expenseCount,
  groupCurrency = 'INR',
  onOpenSettle,
}) {
  const youOwe = userNetBalance < -0.005 ? Math.abs(userNetBalance) : 0;
  const youGetBack = userNetBalance > 0.005 ? userNetBalance : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      
      {/* 1. TOTAL SPENT */}
      <div className="relative bg-[#FFE600] text-black border-3 border-black p-4 brutal-shadow-md rounded-lg overflow-hidden group hover:-translate-y-1 transition-transform">
        <div className="washi-tape-top"></div>
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs tracking-wider uppercase text-black/80 flex items-center gap-1.5">
            <ReceiptText className="w-4 h-4 text-black" /> Total Group Spend
          </span>
          <span className="bg-black text-[#FFE600] text-[11px] font-mono-numbers px-2 py-0.5 rounded font-bold">
            {expenseCount} items
          </span>
        </div>
        <div className="mt-3 font-mono-numbers text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
          {formatCurrency(totalGroupSpend, groupCurrency)}
        </div>
        <div className="mt-2 text-xs font-bold font-handwriting text-black/75">
          Everything spent so far in this circle! 🍕
        </div>
        <div className="absolute -bottom-6 -right-6 text-6xl opacity-10 select-none group-hover:rotate-12 transition-transform">
          💸
        </div>
      </div>

      {/* 2. YOUR SHARE */}
      <div className="relative bg-[#00F0FF] text-black border-3 border-black p-4 brutal-shadow-md rounded-lg overflow-hidden group hover:-translate-y-1 transition-transform">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs tracking-wider uppercase text-black/80 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-black" /> Your Total Share
          </span>
          <span className="text-lg">{currentMember?.emoji || '⚡'}</span>
        </div>
        <div className="mt-3 font-mono-numbers text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
          {formatCurrency(userConsumedShare, groupCurrency)}
        </div>
        <div className="mt-2 text-xs font-bold font-handwriting text-black/75">
          {userConsumedShare > 0
            ? 'What you have eaten, ridden, or enjoyed! 🎢'
            : 'You have consumed zero so far. Freeloader? 😜'}
        </div>
        <div className="absolute -bottom-6 -right-6 text-6xl opacity-10 select-none group-hover:rotate-12 transition-transform">
          🍔
        </div>
      </div>

      {/* 3. YOU OWE */}
      <div
        className={`relative border-3 border-black p-4 brutal-shadow-md rounded-lg overflow-hidden group hover:-translate-y-1 transition-transform ${
          youOwe > 0
            ? 'bg-[#FF2E93] text-white animate-shake'
            : 'bg-white dark:bg-[#1E1F2A] text-black dark:text-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs tracking-wider uppercase flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> You Owe
          </span>
          {youOwe > 0 && (
            <span className="bg-black text-[#FFE600] text-[10px] font-mono-numbers px-2 py-0.5 rounded font-extrabold animate-pulse">
              PAY UP!
            </span>
          )}
        </div>
        <div className="mt-3 font-mono-numbers text-3xl sm:text-4xl font-extrabold tracking-tight">
          {formatCurrency(youOwe, groupCurrency)}
        </div>
        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-bold font-handwriting">
            {youOwe > 0
              ? 'Pay up before they send leg breakers! 🏃‍♂️'
              : 'Zero debts! Your conscience is spotless. 😇'}
          </p>
          {youOwe > 0 && (
            <button
              onClick={onOpenSettle}
              className="bg-[#FFE600] text-black text-xs font-heading px-3 py-2 border-2 border-black brutal-shadow-sm brutal-btn rounded uppercase min-h-[40px] flex items-center"
            >
              Settle
            </button>
          )}
        </div>
        <div className="absolute -bottom-6 -right-6 text-6xl opacity-10 select-none group-hover:rotate-12 transition-transform">
          🚨
        </div>
      </div>

      {/* 4. YOU GET BACK */}
      <div
        className={`relative border-3 border-black p-4 brutal-shadow-md rounded-lg overflow-hidden group hover:-translate-y-1 transition-transform ${
          youGetBack > 0
            ? 'bg-[#B6FF00] text-black'
            : 'bg-white dark:bg-[#1E1F2A] text-black dark:text-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-black" /> You Get Back
          </span>
          {youGetBack > 0 && (
            <span className="bg-black text-[#B6FF00] text-[10px] font-mono-numbers px-2 py-0.5 rounded font-extrabold">
              INCOMING 💰
            </span>
          )}
        </div>
        <div className="mt-3 font-mono-numbers text-3xl sm:text-4xl font-extrabold tracking-tight text-black dark:text-inherit">
          {formatCurrency(youGetBack, groupCurrency)}
        </div>
        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-bold font-handwriting text-black/80 dark:text-gray-300">
            {youGetBack > 0
              ? 'You sponsored the vibe. Time to harvest! 🌾'
              : 'All squares. No one owes you cash currently.'}
          </p>
          {youGetBack > 0 && (
            <button
              onClick={onOpenSettle}
              className="bg-black text-[#B6FF00] text-xs font-heading px-3 py-2 border-2 border-black brutal-shadow-sm brutal-btn rounded uppercase min-h-[40px] flex items-center"
            >
              Collect
            </button>
          )}
        </div>
        <div className="absolute -bottom-6 -right-6 text-6xl opacity-10 select-none group-hover:rotate-12 transition-transform">
          👑
        </div>
      </div>

    </div>
  );
}
