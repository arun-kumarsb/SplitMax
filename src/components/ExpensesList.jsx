import React, { useState } from 'react';
import { CATEGORIES } from '../utils/constants';
import { formatCurrency } from '../utils/expenseLogic';
import {
  Search,
  Edit2,
  Trash2,
  Calendar,
  Users,
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function ExpensesList({
  expenses = [],
  members = [],
  groupCurrency = 'INR',
  onEditExpense,
  onDeleteExpense,
  onOpenAddExpense,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest' | 'title'

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  // Filter & Search Logic
  const filteredExpenses = expenses.filter((e) => {
    // 1. Keyword search
    const desc = (e.description || '').toLowerCase();
    const notes = (e.notes || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch = !query || desc.includes(query) || notes.includes(query);

    // 2. Category filter
    const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;

    // 3. Member filter (paid by or included in splits)
    let matchesMember = selectedMember === 'ALL';
    if (!matchesMember) {
      const isPayer = e.isMultiPayer
        ? Boolean(e.payers && e.payers[selectedMember])
        : e.paidBy === selectedMember;
      const isDebtor = Boolean(e.splits && e.splits[selectedMember]);
      matchesMember = isPayer || isDebtor;
    }

    return matchesSearch && matchesCategory && matchesMember;
  });

  // Sort logic
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.date || 0) - new Date(a.date || 0);
    if (sortBy === 'oldest') return new Date(a.date || 0) - new Date(b.date || 0);
    if (sortBy === 'highest') return (b.amount || 0) - (a.amount || 0);
    if (sortBy === 'lowest') return (a.amount || 0) - (b.amount || 0);
    if (sortBy === 'title') return (a.description || '').localeCompare(b.description || '');
    return 0;
  });

  return (
    <div className="bg-white dark:bg-[#161722] border-3 border-black dark:border-white p-4 sm:p-5 rounded-lg brutal-shadow-md my-6 relative">
      {/* Title & Add Shortcut */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black dark:border-gray-700 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-[#FFE600] text-black font-display text-sm px-2.5 py-1 border-2 border-black brutal-shadow-sm -rotate-1 min-h-[36px] flex items-center">
            FEED // LOG
          </span>
          <h2 className="font-heading text-lg sm:text-xl text-black dark:text-white">
            Expenses History
          </h2>
          <span className="bg-black text-[#FFE600] text-xs font-mono-numbers px-2 py-0.5 rounded font-bold">
            {filteredExpenses.length} of {expenses.length}
          </span>
        </div>

        <button
          onClick={() => {
            sounds.playPop();
            onOpenAddExpense();
          }}
          className="bg-[#B6FF00] hover:bg-[#c9ff42] text-black font-heading text-xs px-3.5 py-2 border-2 border-black brutal-btn brutal-shadow-sm rounded flex items-center gap-1.5 min-h-[40px]"
        >
          <span>+ ADD EXPENSE</span>
        </button>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search expenses, hotels, crabs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-[#1E1F2A] border-2 border-black rounded text-xs font-mono-numbers text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFE600] min-h-[40px]"
            />
          </div>

          {/* Member Filter Dropdown */}
          <div className="md:col-span-4 relative">
            <select
              aria-label="Filter expenses by member"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full py-2.5 px-3 bg-gray-50 dark:bg-[#1E1F2A] border-2 border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] min-h-[40px]"
            >
              <option value="ALL">All Members Involved</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji} {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="md:col-span-3 relative">
            <select
              aria-label="Sort expenses"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2.5 px-3 bg-gray-50 dark:bg-[#1E1F2A] border-2 border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF2E93] min-h-[40px]"
            >
              <option value="newest">📅 Newest First</option>
              <option value="oldest">📅 Oldest First</option>
              <option value="highest">💰 Highest Amount</option>
              <option value="lowest">💰 Lowest Amount</option>
              <option value="title">🔤 Title A-Z</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips (Min 40x40px tap target) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => {
              sounds.playPop();
              setSelectedCategory('ALL');
            }}
            className={`px-3 py-2 text-xs font-mono-numbers font-bold border-2 border-black rounded whitespace-nowrap transition-all min-h-[40px] flex items-center ${
              selectedCategory === 'ALL'
                ? 'bg-black text-[#FFE600] brutal-shadow-sm'
                : 'bg-gray-100 dark:bg-[#202230] text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            ★ ALL ({expenses.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = expenses.filter((e) => e.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  sounds.playPop();
                  setSelectedCategory(cat.id);
                }}
                className={`px-3 py-2 text-xs font-mono-numbers font-bold border-2 border-black rounded whitespace-nowrap flex items-center gap-1.5 transition-all min-h-[40px] ${
                  isSelected
                    ? 'bg-[#FF2E93] text-white brutal-shadow-sm'
                    : 'bg-white dark:bg-[#202230] text-gray-700 dark:text-gray-300 hover:bg-yellow-50'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expenses Cards List */}
      <div className="mt-5 space-y-3">
        {expenses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-[#1A1C28] border-3 border-dashed border-black dark:border-gray-700 rounded-lg p-6 space-y-3">
            <div className="text-5xl animate-bounce">🍕</div>
            <div className="font-heading text-lg text-black dark:text-white">
              NO EXPENSES RECORDED YET!
            </div>
            <p className="text-xs font-mono-numbers text-gray-500 max-w-sm mx-auto">
              Nothing has been spent in this group yet. Add the first dinner, taxi, or grocery bill to get started!
            </p>
            <button
              onClick={() => {
                sounds.playPop();
                onOpenAddExpense();
              }}
              className="bg-[#FFE600] hover:bg-[#ffd900] text-black font-heading text-xs px-5 py-2.5 border-3 border-black brutal-shadow brutal-btn rounded uppercase min-h-[40px] inline-flex items-center gap-2"
            >
              <span>+ ADD THE FIRST EXPENSE</span>
            </button>
          </div>
        ) : sortedExpenses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-[#1A1C28] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <div className="text-4xl mb-2">🕵️‍♂️</div>
            <div className="font-heading text-base text-black dark:text-white">
              No matching expenses found!
            </div>
            <div className="text-xs font-mono-numbers text-gray-500 mt-1">
              Try adjusting your search terms or filters.
            </div>
          </div>
        ) : (
          sortedExpenses.map((exp, idx) => {
            const cat = CATEGORIES.find((c) => c.id === exp.category) || {
              emoji: '🏷️',
              name: exp.category,
              color: '#FFE600',
            };

            // Format payer info
            let payerText = '';
            if (exp.isMultiPayer && exp.payers) {
              const count = Object.keys(exp.payers).length;
              payerText = `${count} Payers (split bill)`;
            } else {
              const payer = memberMap[exp.paidBy];
              payerText = payer ? `${payer.emoji} ${payer.name}` : 'Unknown';
            }

            const splitMethodLabels = {
              equal: 'Equally Split',
              exact: 'Exact Amounts',
              percentage: 'Percentages',
              shares: 'By Shares',
            };

            const participantCount = Object.keys(exp.splits || {}).length;

            return (
              <div
                key={exp.id || idx}
                className="bg-white dark:bg-[#1E1F2A] border-2 border-black p-3.5 sm:p-4 rounded-lg brutal-shadow-sm hover:brutal-shadow transition-all group relative overflow-hidden"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  
                  {/* Left: Category Icon + Description + Meta */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-black rounded flex items-center justify-center text-xl sm:text-2xl brutal-shadow-sm shrink-0"
                      style={{ backgroundColor: cat.color || '#FFE600' }}
                    >
                      {cat.emoji}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading text-sm sm:text-base text-black dark:text-white">
                          {exp.description}
                        </h3>
                        <span className="text-[10px] font-mono-numbers font-bold px-1.5 py-0.5 border border-black bg-gray-100 dark:bg-gray-800 rounded">
                          {splitMethodLabels[exp.splitMethod] || exp.splitMethod}
                        </span>
                      </div>

                      {/* Notes if any */}
                      {exp.notes && (
                        <div className="text-xs font-handwriting text-gray-600 dark:text-gray-300 mt-0.5">
                          "{exp.notes}"
                        </div>
                      )}

                      {/* Metadata Row: Date, Payer, Participants */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono-numbers text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {exp.date}
                        </span>

                        <span className="flex items-center gap-1">
                          <strong className="text-black dark:text-gray-200">Paid by:</strong>{' '}
                          {payerText}
                        </span>

                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {participantCount} participants
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Action Buttons (Min 40x40px tap target) */}
                  <div className="flex flex-col items-end gap-2 ml-auto">
                    <div className="font-mono-numbers text-lg sm:text-xl font-extrabold text-black dark:text-white">
                      {formatCurrency(exp.amount, groupCurrency)}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          sounds.playPop();
                          onEditExpense(exp);
                        }}
                        title="Edit expense"
                        className="p-2 bg-[#FFE600] text-black border-2 border-black brutal-btn rounded min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-[#ffd900]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${exp.description}"? You can undo this action from the Activity Feed.`)) {
                            sounds.playSuccess();
                            onDeleteExpense(exp.id);
                          }
                        }}
                        title="Delete expense"
                        className="p-2 bg-[#FF2E93] text-white border-2 border-black brutal-btn rounded min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-[#e0207e]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* Avatar Mini-Stack of Participants */}
                <div className="mt-3 pt-2.5 border-t border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-between text-[11px] font-mono-numbers">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-gray-400 mr-1">Split with:</span>
                    {Object.entries(exp.splits || {}).map(([memberId, share]) => {
                      const member = memberMap[memberId] || { name: '?', emoji: '👤', color: '#ccc' };
                      return (
                        <span
                          key={memberId}
                          title={`${member.name}: ${formatCurrency(share, groupCurrency)}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-black text-[10px] font-bold"
                          style={{ backgroundColor: `${member.color}33` }}
                        >
                          <span>{member.emoji}</span>
                          <span>{member.name?.split(' ')[0]}</span>
                          <span className="opacity-75">({formatCurrency(share, groupCurrency)})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
