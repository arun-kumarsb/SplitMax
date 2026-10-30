import React from 'react';
import { Plus, LayoutDashboard, Scale, Receipt, History } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function FloatingControls({
  onOpenAddExpense,
  activeTab,
  onSelectTab,
  onOpenActivity,
}) {
  return (
    <>
      {/* Giant Floating Add Button (Desktop & Tablet) */}
      <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
        <button
          onClick={() => {
            sounds.playPop();
            onOpenAddExpense();
          }}
          className="bg-[#FFE600] hover:bg-[#fff04d] text-black font-display text-sm md:text-base px-6 py-4 border-4 border-black rounded-full brutal-shadow-lg brutal-btn flex items-center gap-2.5 animate-pulse-glow min-h-[48px]"
        >
          <span className="p-1 bg-black text-[#FFE600] rounded-full border border-black">
            <Plus className="w-5 h-5 stroke-[3]" />
          </span>
          <span className="tracking-wide">ADD EXPENSE</span>
        </button>
      </div>

      {/* Mobile Sticky Bottom Tab Bar (Under 640px) - Min 40x40px tap targets */}
      <nav aria-label="Mobile navigation" className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0D0E15] border-t-4 border-black dark:border-[#FFE600] px-2 py-2 flex items-center justify-around brutal-shadow">
        
        {/* Dashboard Tab */}
        <button
          onClick={() => {
            sounds.playPop();
            onSelectTab('dashboard');
          }}
          className={`flex flex-col items-center justify-center p-1.5 font-mono-numbers text-[10px] font-bold min-h-[40px] min-w-[44px] ${
            activeTab === 'dashboard' ? 'text-[#FF2E93]' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Stats</span>
        </button>

        {/* Expenses Feed Tab */}
        <button
          onClick={() => {
            sounds.playPop();
            onSelectTab('expenses');
          }}
          className={`flex flex-col items-center justify-center p-1.5 font-mono-numbers text-[10px] font-bold min-h-[40px] min-w-[44px] ${
            activeTab === 'expenses' ? 'text-[#00F0FF]' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span>Expenses</span>
        </button>

        {/* Big Center Add Button */}
        <button
          onClick={() => {
            sounds.playPop();
            onOpenAddExpense();
          }}
          className="bg-[#FFE600] text-black p-3.5 rounded-full border-3 border-black -mt-6 brutal-shadow-sm brutal-btn min-h-[48px] min-w-[48px] flex items-center justify-center"
          title="Add Expense"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        {/* Balances Tab */}
        <button
          onClick={() => {
            sounds.playPop();
            onSelectTab('balances');
          }}
          className={`flex flex-col items-center justify-center p-1.5 font-mono-numbers text-[10px] font-bold min-h-[40px] min-w-[44px] ${
            activeTab === 'balances' ? 'text-[#B6FF00]' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Scale className="w-5 h-5" />
          <span>Debts</span>
        </button>

        {/* Activity Tab */}
        <button
          onClick={() => {
            sounds.playPop();
            onOpenActivity();
          }}
          className="flex flex-col items-center justify-center p-1.5 font-mono-numbers text-[10px] font-bold text-gray-500 dark:text-gray-400 min-h-[40px] min-w-[44px]"
        >
          <History className="w-5 h-5" />
          <span>Log</span>
        </button>

      </nav>
    </>
  );
}
