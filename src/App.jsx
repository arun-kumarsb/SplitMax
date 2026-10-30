import React, { useState, useEffect } from 'react';
import {
  INITIAL_GROUPS,
  INITIAL_MEMBERS,
  INITIAL_ACTIVITY,
} from './utils/demoData';
import {
  calculateNetBalances,
  simplifyDebts,
  calculateBilateralDebts,
  runSanityChecks,
} from './utils/expenseLogic';
import { sounds } from './utils/audio';

// Components
import Header from './components/Header';
import MarqueeTicker from './components/MarqueeTicker';
import DashboardStats from './components/DashboardStats';
import ChartsSection from './components/ChartsSection';
import BalancesSection from './components/BalancesSection';
import ExpensesList from './components/ExpensesList';
import AddExpenseModal from './components/AddExpenseModal';
import SettleUpModal from './components/SettleUpModal';
import ActivityFeedModal from './components/ActivityFeedModal';
import GroupModal from './components/GroupModal';
import FloatingControls from './components/FloatingControls';

const STORAGE_KEY_GROUPS = 'splitmax_groups_v1';
const STORAGE_KEY_MEMBERS = 'splitmax_members_v1';
const STORAGE_KEY_ACTIVITY = 'splitmax_activity_v1';
const STORAGE_KEY_USER = 'splitmax_current_user_v1';
const STORAGE_KEY_DARK = 'splitmax_dark_mode_v1';
const STORAGE_KEY_MUTE = 'splitmax_muted_v1';

export default function App() {
  // Run pure sanity checks in development on load
  useEffect(() => {
    const checkResults = runSanityChecks();
    console.log('⚡ [SPLIT//MAX] Math Sanity Checks:', checkResults);
  }, []);

  // 1. Persistent State
  const [groups, setGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GROUPS);
      return saved ? JSON.parse(saved) : INITIAL_GROUPS;
    } catch {
      return INITIAL_GROUPS;
    }
  });

  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMBERS);
      return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITY;
    } catch {
      return INITIAL_ACTIVITY;
    }
  });

  const [activeGroupId, setActiveGroupId] = useState(() => {
    return groups[0]?.id || 'grp_goa';
  });

  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || 'm_rahul';
    } catch {
      return 'm_rahul';
    }
  });

  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DARK) === 'true';
    } catch {
      return false;
    }
  });

  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_MUTE) === 'true';
    } catch {
      return false;
    }
  });

  // Undo history stack
  const [undoStack, setUndoStack] = useState([]);

  // Modal Visibility States
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState(null);

  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Mobile View Navigation Tab: 'dashboard' | 'expenses' | 'balances'
  const [mobileTab, setMobileTab] = useState('dashboard');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
    } catch (e) {
      console.error(e);
    }
  }, [groups]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
    } catch (e) {
      console.error(e);
    }
  }, [members]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(activities));
    } catch (e) {
      console.error(e);
    }
  }, [activities]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER, currentUserId);
    } catch (e) {
      console.error(e);
    }
  }, [currentUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DARK, String(isDark));
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [isDark]);

  useEffect(() => {
    sounds.setMuted(isMuted);
    try {
      localStorage.setItem(STORAGE_KEY_MUTE, String(isMuted));
    } catch (e) {
      console.error(e);
    }
  }, [isMuted]);

  // Derived Active Group & Members
  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0] || {
    id: 'grp_default',
    name: 'General',
    emoji: '📁',
    expenses: [],
    settlements: [],
    memberIds: [],
  };

  const groupMembers = members.filter((m) =>
    (activeGroup.memberIds || []).includes(m.id)
  );

  const currentMember = members.find((m) => m.id === currentUserId) || members[0];

  // Mathematical Calculations
  const expenses = activeGroup.expenses || [];
  const settlements = activeGroup.settlements || [];

  const totalGroupSpend = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Net Balances Map
  const netBalances = calculateNetBalances(groupMembers, expenses, settlements);

  // Simplified Debts (Greedy Net Matching)
  const simplifiedDebts = simplifyDebts(netBalances);

  // Bilateral Debts (Pairwise direct)
  const bilateralDebts = calculateBilateralDebts(groupMembers, expenses, settlements);

  // User Specific Stats
  const userNetBalance = netBalances[currentUserId] || 0;

  const userConsumedShare = expenses.reduce((acc, exp) => {
    if (exp.splits && exp.splits[currentUserId] !== undefined) {
      return acc + Number(exp.splits[currentUserId]);
    }
    return acc;
  }, 0);

  // Helper to push undo snapshot before mutation
  const pushUndoSnapshot = () => {
    setUndoStack((prev) => [
      ...prev.slice(-10), // keep last 10 snapshots
      {
        groups: JSON.parse(JSON.stringify(groups)),
        activities: JSON.parse(JSON.stringify(activities)),
      },
    ]);
  };

  // 2. Action Handlers

  // Save Expense (Add or Edit)
  const handleSaveExpense = (expenseData) => {
    pushUndoSnapshot();

    const isEdit = Boolean(editingExpense);
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.id !== activeGroupId) return g;

        let updatedExpenses = [];
        if (isEdit) {
          updatedExpenses = (g.expenses || []).map((e) =>
            e.id === expenseData.id ? expenseData : e
          );
        } else {
          updatedExpenses = [expenseData, ...(g.expenses || [])];
        }

        return {
          ...g,
          expenses: updatedExpenses,
        };
      })
    );

    // Log Activity
    const newActivity = {
      id: `act_${Date.now()}`,
      type: isEdit ? 'expense_edit' : 'expense_add',
      timestamp: new Date().toISOString(),
      groupId: activeGroupId,
      groupName: activeGroup.name,
      description: isEdit
        ? `Edited expense "${expenseData.description}" (${expenseData.amount})`
        : `Added expense "${expenseData.description}" for ${expenseData.amount}`,
      amount: expenseData.amount,
      data: expenseData,
    };

    setActivities((prev) => [newActivity, ...prev]);
    setEditingExpense(null);
  };

  // Delete Expense
  const handleDeleteExpense = (expenseId) => {
    pushUndoSnapshot();

    const targetExpense = expenses.find((e) => e.id === expenseId);

    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.id !== activeGroupId) return g;
        return {
          ...g,
          expenses: (g.expenses || []).filter((e) => e.id !== expenseId),
        };
      })
    );

    // Log Activity
    const newActivity = {
      id: `act_${Date.now()}`,
      type: 'expense_delete',
      timestamp: new Date().toISOString(),
      groupId: activeGroupId,
      groupName: activeGroup.name,
      description: `Deleted expense "${targetExpense?.description || 'Item'}"`,
      amount: targetExpense?.amount,
      data: targetExpense,
    };

    setActivities((prev) => [newActivity, ...prev]);
  };

  // Record Settlement
  const handleRecordSettlement = (settlementData) => {
    pushUndoSnapshot();

    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.id !== activeGroupId) return g;
        return {
          ...g,
          settlements: [settlementData, ...(g.settlements || [])],
        };
      })
    );

    const fromM = members.find((m) => m.id === settlementData.from)?.name || 'Someone';
    const toM = members.find((m) => m.id === settlementData.to)?.name || 'Someone';

    const newActivity = {
      id: `act_${Date.now()}`,
      type: 'settlement',
      timestamp: new Date().toISOString(),
      groupId: activeGroupId,
      groupName: activeGroup.name,
      description: `${fromM} paid ${toM} ₹${settlementData.amount.toLocaleString('en-IN')}`,
      amount: settlementData.amount,
      data: settlementData,
    };

    setActivities((prev) => [newActivity, ...prev]);
    setSettlePrefill(null);
  };

  // Undo Last Action
  const handleUndoLastAction = () => {
    if (undoStack.length === 0) return;
    const lastSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setGroups(lastSnapshot.groups);
    setActivities(lastSnapshot.activities);
  };

  // Create / Edit Group
  const handleSaveGroup = (groupData) => {
    pushUndoSnapshot();
    const isEdit = Boolean(groupToEdit);

    if (isEdit) {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupData.id ? { ...g, ...groupData } : g))
      );
    } else {
      setGroups((prev) => [...prev, groupData]);
      setActiveGroupId(groupData.id);
    }
    setGroupToEdit(null);
  };

  // Delete Group
  const handleDeleteGroup = (groupIdToDelete) => {
    if (groups.length <= 1) {
      sounds.playBuzzer();
      alert('You must keep at least one group in the tracker!');
      return;
    }
    pushUndoSnapshot();
    const remaining = groups.filter((g) => g.id !== groupIdToDelete);
    setGroups(remaining);
    setActiveGroupId(remaining[0].id);
  };

  // Add Member
  const handleAddNewMember = (newMember) => {
    setMembers((prev) => [...prev, newMember]);
  };

  // Reset Demo Data
  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY_GROUPS);
    localStorage.removeItem(STORAGE_KEY_MEMBERS);
    localStorage.removeItem(STORAGE_KEY_ACTIVITY);
    setGroups(INITIAL_GROUPS);
    setMembers(INITIAL_MEMBERS);
    setActivities(INITIAL_ACTIVITY);
    setActiveGroupId('grp_goa');
    setUndoStack([]);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] dark:bg-[#0B0C10] text-[#0F0F14] dark:text-white transition-colors pb-24 sm:pb-16 selection:bg-[#FFE600] selection:text-black">
      
      {/* 1. TOP MARQUEE TICKER */}
      <MarqueeTicker
        totalSpend={totalGroupSpend}
        youOwe={userNetBalance < 0 ? Math.abs(userNetBalance) : 0}
        youGetBack={userNetBalance > 0 ? userNetBalance : 0}
        activeGroupName={activeGroup.name}
        expenseCount={expenses.length}
      />

      {/* 2. MAXIMALIST HEADER & CONTROLS */}
      <Header
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={(id) => setActiveGroupId(id)}
        onOpenCreateGroup={() => {
          setGroupToEdit(null);
          setIsGroupModalOpen(true);
        }}
        onOpenEditGroup={(grp) => {
          setGroupToEdit(grp);
          setIsGroupModalOpen(true);
        }}
        members={members}
        currentUserId={currentUserId}
        onSelectUser={(uId) => setCurrentUserId(uId)}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        onOpenActivity={() => setIsActivityOpen(true)}
        onResetDemoData={handleResetDemoData}
      />

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">
        
        {/* Active Group Hero Badge Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="text-2xl sm:text-3xl p-2 border-3 border-black rounded-lg brutal-shadow-sm -rotate-2"
              style={{ backgroundColor: activeGroup.signatureColor || '#FF7A00' }}
            >
              {activeGroup.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-3xl text-black dark:text-white tracking-wide">
                  {activeGroup.name}
                </h1>
                <span className="hidden sm:inline-block text-xs font-mono-numbers px-2 py-0.5 border border-black bg-[#B6FF00] text-black rounded font-bold">
                  {groupMembers.length} MEMBERS
                </span>
              </div>
              <p className="text-xs font-handwriting text-gray-600 dark:text-gray-300">
                Viewing as <strong>{currentMember.name}</strong> • Real-time zero-loss paise math
              </p>
            </div>
          </div>

          {/* Quick Action Pill Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playPop();
                setSettlePrefill(null);
                setIsSettleOpen(true);
              }}
              className="bg-[#B6FF00] hover:bg-[#caff43] text-black font-heading text-xs px-3.5 py-2 border-2 border-black brutal-shadow-sm brutal-btn rounded uppercase flex items-center gap-1.5"
            >
              <span>💸 Settle Up</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setEditingExpense(null);
                setIsAddExpenseOpen(true);
              }}
              className="bg-[#FFE600] hover:bg-[#fff04d] text-black font-heading text-xs px-3.5 py-2 border-2 border-black brutal-shadow-sm brutal-btn rounded uppercase flex items-center gap-1.5"
            >
              <span>+ Add Expense</span>
            </button>
          </div>
        </div>

        {/* Desktop View & Mobile Tab Router */}
        <div className="space-y-6">
          
          {/* Dashboard Stats Bento Bar (Always on Desktop; or when tab == 'dashboard' on mobile) */}
          <div className={`transition-all ${mobileTab !== 'dashboard' ? 'hidden sm:block' : 'block'}`}>
            <DashboardStats
              totalGroupSpend={totalGroupSpend}
              userConsumedShare={userConsumedShare}
              userNetBalance={userNetBalance}
              currentMember={currentMember}
              expenseCount={expenses.length}
              onOpenSettle={() => {
                setSettlePrefill(null);
                setIsSettleOpen(true);
              }}
            />

            {/* Visual Charts Section */}
            <ChartsSection
              group={activeGroup}
              members={groupMembers}
            />
          </div>

          {/* Balances & Debt Minimization Section (Always on Desktop; or when tab == 'balances' on mobile) */}
          <div className={`transition-all ${mobileTab !== 'balances' ? 'hidden sm:block' : 'block'}`}>
            <BalancesSection
              group={activeGroup}
              members={groupMembers}
              netBalances={netBalances}
              simplifiedDebts={simplifiedDebts}
              bilateralDebts={bilateralDebts}
              onOpenSettleWithPrefill={(prefill) => {
                setSettlePrefill(prefill);
                setIsSettleOpen(true);
              }}
            />
          </div>

          {/* Expenses List & Filters Section (Always on Desktop; or when tab == 'expenses' on mobile) */}
          <div className={`transition-all ${mobileTab !== 'expenses' ? 'hidden sm:block' : 'block'}`}>
            <ExpensesList
              expenses={expenses}
              members={groupMembers}
              onEditExpense={(exp) => {
                setEditingExpense(exp);
                setIsAddExpenseOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
              onOpenAddExpense={() => {
                setEditingExpense(null);
                setIsAddExpenseOpen(true);
              }}
            />
          </div>

        </div>

      </main>

      {/* 4. FLOATING CONTROLS & MOBILE BAR */}
      <FloatingControls
        onOpenAddExpense={() => {
          setEditingExpense(null);
          setIsAddExpenseOpen(true);
        }}
        activeTab={mobileTab}
        onSelectTab={(tab) => setMobileTab(tab)}
        onOpenActivity={() => setIsActivityOpen(true)}
      />

      {/* 5. MODALS */}
      {/* Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={handleSaveExpense}
        members={groupMembers}
        editingExpense={editingExpense}
        activeGroupId={activeGroupId}
      />

      {/* Settle Up Modal */}
      <SettleUpModal
        isOpen={isSettleOpen}
        onClose={() => {
          setIsSettleOpen(false);
          setSettlePrefill(null);
        }}
        members={groupMembers}
        onRecordSettlement={handleRecordSettlement}
        prefill={settlePrefill}
      />

      {/* Activity Feed Modal */}
      <ActivityFeedModal
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        activities={activities}
        onUndoLastAction={handleUndoLastAction}
        canUndo={undoStack.length > 0}
      />

      {/* Group Create/Edit Modal */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setGroupToEdit(null);
        }}
        groupToEdit={groupToEdit}
        allMembers={members}
        onSaveGroup={handleSaveGroup}
        onDeleteGroup={handleDeleteGroup}
        onAddNewMember={handleAddNewMember}
      />

    </div>
  );
}
