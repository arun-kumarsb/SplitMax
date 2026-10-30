import React, { useState } from 'react';
import { CATEGORIES } from '../utils/demoData';
import { formatCurrency } from '../utils/expenseLogic';
import { PieChart, BarChart3, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function ChartsSection({ group, members }) {
  const [activeTab, setActiveTab] = useState('category'); // 'category' | 'time' | 'members'
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const expenses = group?.expenses || [];
  const totalSpend = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  // 1. Data for Category Donut
  const categorySpendMap = {};
  CATEGORIES.forEach((c) => {
    categorySpendMap[c.id] = { ...c, total: 0 };
  });

  expenses.forEach((e) => {
    const catId = e.category || 'food';
    if (!categorySpendMap[catId]) {
      categorySpendMap[catId] = { id: catId, name: catId, emoji: '🏷️', color: '#FFE600', total: 0 };
    }
    categorySpendMap[catId].total += Number(e.amount || 0);
  });

  const categoryData = Object.values(categorySpendMap)
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // SVG Donut calculation
  let cumulativeAngle = 0;
  const donutSegments = categoryData.map((cat) => {
    const fraction = totalSpend > 0 ? cat.total / totalSpend : 0;
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      ...cat,
      fraction,
      percentage: (fraction * 100).toFixed(1),
      startAngle,
      angle,
    };
  });

  // 2. Data for Spending Over Time
  const dateMap = {};
  expenses.forEach((e) => {
    const d = e.date || 'Undated';
    dateMap[d] = (dateMap[d] || 0) + Number(e.amount || 0);
  });
  const timeData = Object.entries(dateMap)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      amount,
    }));
  const maxTimeAmount = Math.max(...timeData.map((d) => d.amount), 1);

  // 3. Data for Member Contribution
  const memberSpendMap = {};
  members.forEach((m) => {
    memberSpendMap[m.id] = { member: m, paid: 0, owed: 0 };
  });

  expenses.forEach((e) => {
    if (e.isMultiPayer && e.payers) {
      Object.entries(e.payers).forEach(([pid, amt]) => {
        if (memberSpendMap[pid]) memberSpendMap[pid].paid += Number(amt);
      });
    } else if (e.paidBy && memberSpendMap[e.paidBy]) {
      memberSpendMap[e.paidBy].paid += Number(e.amount);
    }

    if (e.splits) {
      Object.entries(e.splits).forEach(([debtorId, amt]) => {
        if (memberSpendMap[debtorId]) memberSpendMap[debtorId].owed += Number(amt);
      });
    }
  });

  const memberData = Object.values(memberSpendMap);
  const maxMemberMetric = Math.max(
    ...memberData.map((m) => Math.max(m.paid, m.owed)),
    1
  );

  return (
    <div className="bg-white dark:bg-[#161722] border-3 border-black dark:border-white p-4 sm:p-5 rounded-lg brutal-shadow-md my-6 relative">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black dark:border-gray-700 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-[#FF2E93] text-black font-display text-sm px-2.5 py-1 border-2 border-black brutal-shadow-sm -rotate-1">
            CHARTS // DATA
          </span>
          <h2 className="font-heading text-lg sm:text-xl text-black dark:text-white">
            Visual Cash Flow
          </h2>
        </div>

        {/* Tab Controls & Collapse */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#F3F4F6] dark:bg-[#202230] border-2 border-black p-0.5 rounded">
            <button
              onClick={() => {
                sounds.playPop();
                setActiveTab('category');
              }}
              className={`px-2.5 py-1 text-xs font-mono-numbers font-bold rounded flex items-center gap-1 transition-all ${
                activeTab === 'category'
                  ? 'bg-[#FFE600] text-black border-2 border-black brutal-shadow-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Category</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setActiveTab('time');
              }}
              className={`px-2.5 py-1 text-xs font-mono-numbers font-bold rounded flex items-center gap-1 transition-all ${
                activeTab === 'time'
                  ? 'bg-[#00F0FF] text-black border-2 border-black brutal-shadow-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setActiveTab('members');
              }}
              className={`px-2.5 py-1 text-xs font-mono-numbers font-bold rounded flex items-center gap-1 transition-all ${
                activeTab === 'members'
                  ? 'bg-[#B6FF00] text-black border-2 border-black brutal-shadow-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Members</span>
            </button>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 border-2 border-black bg-[#FFE600] text-black rounded brutal-shadow-sm brutal-btn"
            title={collapsed ? 'Expand Charts' : 'Collapse Charts'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 pt-2">
          {expenses.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-mono-numbers">
              No expenses recorded yet in this group to plot charts.
            </div>
          ) : (
            <>
              {/* TAB 1: CATEGORY DONUT */}
              {activeTab === 'category' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* SVG Donut */}
                  <div className="relative flex justify-center items-center py-4">
                    <svg viewBox="0 0 200 200" className="w-52 h-52 sm:w-60 sm:h-60 transform -rotate-90">
                      {donutSegments.map((seg, idx) => {
                        const radius = 70;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDasharray = `${(seg.fraction * circumference)} ${circumference}`;
                        const strokeDashoffset = -(seg.startAngle / 360) * circumference;

                        return (
                          <circle
                            key={seg.id}
                            cx="100"
                            cy="100"
                            r={radius}
                            fill="transparent"
                            stroke={seg.color || '#FFE600'}
                            strokeWidth={hoveredSlice === seg.id ? "30" : "24"}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="cursor-pointer transition-all duration-200 hover:brightness-110"
                            onMouseEnter={() => setHoveredSlice(seg.id)}
                            onMouseLeave={() => setHoveredSlice(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Donut Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] font-heading text-gray-500 uppercase">
                        {hoveredSlice
                          ? categoryData.find((c) => c.id === hoveredSlice)?.name
                          : 'Total Spend'}
                      </span>
                      <span className="font-mono-numbers text-base sm:text-lg font-bold text-black dark:text-white">
                        {hoveredSlice
                          ? formatCurrency(categoryData.find((c) => c.id === hoveredSlice)?.total)
                          : formatCurrency(totalSpend)}
                      </span>
                      <span className="text-[11px] font-bold font-mono-numbers text-[#FF2E93]">
                        {hoveredSlice
                          ? `${donutSegments.find((s) => s.id === hoveredSlice)?.percentage}%`
                          : `${categoryData.length} Categories`}
                      </span>
                    </div>
                  </div>

                  {/* Category Legend & Bars */}
                  <div className="space-y-2.5">
                    {donutSegments.map((seg) => (
                      <div
                        key={seg.id}
                        onMouseEnter={() => setHoveredSlice(seg.id)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className={`p-2 border-2 border-black rounded transition-all cursor-pointer ${
                          hoveredSlice === seg.id
                            ? 'bg-[#FFE600] text-black brutal-shadow-sm -translate-y-0.5'
                            : 'bg-gray-50 dark:bg-[#1E1F2A] hover:bg-yellow-50 dark:hover:bg-[#252838]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="text-base">{seg.emoji}</span>
                            <span className="font-heading">{seg.name}</span>
                          </span>
                          <span className="font-mono-numbers">
                            {formatCurrency(seg.total)}{' '}
                            <span className="text-[10px] text-gray-500 font-normal">
                              ({seg.percentage}%)
                            </span>
                          </span>
                        </div>
                        {/* Candy Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden border border-black">
                          <div
                            className="h-full bg-stripes-candy transition-all duration-500"
                            style={{
                              width: `${seg.percentage}%`,
                              backgroundColor: seg.color || '#FF2E93',
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: TIMELINE SPENDING */}
              {activeTab === 'time' && (
                <div className="pt-2">
                  <div className="flex items-end gap-3 h-52 sm:h-60 overflow-x-auto pb-4 pt-6 border-b-2 border-black dark:border-gray-700">
                    {timeData.map((item, idx) => {
                      const heightPercent = Math.max(12, Math.round((item.amount / maxTimeAmount) * 100));
                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center flex-1 min-w-[50px] group relative"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-black text-[#FFE600] font-mono-numbers text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 border border-[#FFE600]">
                            {formatCurrency(item.amount)}
                          </div>

                          <div className="w-full flex justify-center h-40 items-end">
                            <div
                              className="w-8 sm:w-12 bg-[#00F0FF] hover:bg-[#FFE600] border-2 border-black brutal-shadow-sm rounded-t transition-all group-hover:scale-105"
                              style={{ height: `${heightPercent}%` }}
                            ></div>
                          </div>
                          <span className="mt-2 text-[11px] font-mono-numbers font-bold text-gray-700 dark:text-gray-300">
                            {item.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-right text-xs font-mono-numbers text-gray-500">
                    * Hover bars to see exact daily expense totals
                  </div>
                </div>
              )}

              {/* TAB 3: MEMBER CONTRIBUTION */}
              {activeTab === 'members' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4 text-xs font-mono-numbers font-bold mb-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 bg-[#B6FF00] border border-black inline-block"></span>
                      <span>Paid for Group</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 bg-[#FF2E93] border border-black inline-block"></span>
                      <span>Consumed / Owed</span>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {memberData.map((m) => {
                      const paidWidth = Math.round((m.paid / maxMemberMetric) * 100);
                      const owedWidth = Math.round((m.owed / maxMemberMetric) * 100);

                      return (
                        <div
                          key={m.member.id}
                          className="p-3 bg-gray-50 dark:bg-[#1E1F2A] border-2 border-black rounded"
                        >
                          <div className="flex items-center justify-between text-xs font-bold mb-2">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs"
                                style={{ backgroundColor: m.member.color }}
                              >
                                {m.member.emoji}
                              </span>
                              <span className="font-heading">{m.member.name}</span>
                            </span>
                            <span className="font-mono-numbers text-[11px]">
                              Paid: <strong className="text-green-600 dark:text-[#B6FF00]">{formatCurrency(m.paid)}</strong> | Owed: <strong className="text-pink-600 dark:text-[#FF2E93]">{formatCurrency(m.owed)}</strong>
                            </span>
                          </div>

                          {/* Bars */}
                          <div className="space-y-1.5">
                            {/* Paid bar */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono-numbers w-8 text-right font-bold text-gray-500">
                                PAID
                              </span>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-3 border border-black rounded-sm overflow-hidden">
                                <div
                                  className="h-full bg-[#B6FF00]"
                                  style={{ width: `${paidWidth}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Owed bar */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono-numbers w-8 text-right font-bold text-gray-500">
                                OWED
                              </span>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-3 border border-black rounded-sm overflow-hidden">
                                <div
                                  className="h-full bg-[#FF2E93]"
                                  style={{ width: `${owedWidth}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
