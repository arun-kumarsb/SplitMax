import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { api } from './utils/api';

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
import AuthModal from './components/AuthModal';
import JoinGroupModal from './components/JoinGroupModal';

const STORAGE_KEY_GROUPS = 'splitmax_groups_v1';
const STORAGE_KEY_MEMBERS = 'splitmax_members_v1';
const STORAGE_KEY_ACTIVITY = 'splitmax_activity_v1';
const STORAGE_KEY_DARK = 'splitmax_dark_mode_v1';
const STORAGE_KEY_MUTE = 'splitmax_muted_v1';

export default function App() {
  // 1. Math Sanity Checks on mount
  useEffect(() => {
    const checks = runSanityChecks();
    console.log('⚡ [SPLIT//MAX] Math Sanity Checks:', checks);
  }, []);

  // 2. User & Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // 3. Local / Remote Data State
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

  // Undo Stack
  const [undoStack, setUndoStack] = useState([]);

  // Modals Visibility
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState(null);

  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Mobile View Navigation Tab
  const [mobileTab, setMobileTab] = useState('dashboard');

  // Check if localStorage has old data to import
  const hasLocalData = Boolean(
    currentUser && localStorage.getItem(STORAGE_KEY_GROUPS)
  );

  // Check login status on mount
  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        if (res.user) {
          setCurrentUser(res.user);
        }
      })
      .catch(() => {
        // Not logged in, defaults to offline mode
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  // Fetch groups when user logs in or changes
  const fetchUserGroups = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.getGroups();
      if (res.groups && res.groups.length > 0) {
        setGroups(res.groups);
        if (!res.groups.some((g) => g.id === activeGroupId)) {
          setActiveGroupId(res.groups[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, [currentUser, activeGroupId]);

  useEffect(() => {
    if (currentUser) {
      fetchUserGroups();
    }
  }, [currentUser]);

  // Fetch active group details from backend when logged in
  const fetchActiveGroupDetails = useCallback(async () => {
    if (!currentUser || !activeGroupId) return;
    try {
      const res = await api.getGroup(activeGroupId);
      if (res.group) {
        const g = res.group;
        setGroups((prev) =>
          prev.map((item) => (item.id === g.id ? { ...item, ...g } : item))
        );
        if (g.members) setMembers(g.members);
        if (g.activities) setActivities(g.activities);
      }
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    }
  }, [currentUser, activeGroupId]);

  useEffect(() => {
    if (currentUser) {
      fetchActiveGroupDetails();
    }
  }, [currentUser, activeGroupId]);

  // Rule: Refetch on window focus and every ~15s while group is open
  useEffect(() => {
    if (!currentUser) return;

    const onFocus = () => {
      fetchActiveGroupDetails();
    };
    window.addEventListener('focus', onFocus);

    const interval = setInterval(() => {
      fetchActiveGroupDetails();
    }, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [currentUser, fetchActiveGroupDetails]);

  // Check URL query parameters for invite code join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join') || params.get('invite');
    if (joinCode) {
      if (currentUser) {
        api.joinGroup(joinCode).then((res) => {
          sounds.playSuccess();
          fetchUserGroups();
          if (res.group) setActiveGroupId(res.group.id);
        }).catch((err) => {
          alert(`Failed to join group: ${err.message}`);
        });
      } else {
        setIsJoinModalOpen(true);
      }
    }
  }, [currentUser]);

  // Sync to localStorage when offline
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
        localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
        localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(activities));
      } catch (e) {
        console.error(e);
      }
    }
  }, [groups, members, activities, currentUser]);

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
    currency: 'INR',
    expenses: [],
    settlements: [],
    memberIds: [],
  };

  const groupCurrency = activeGroup.currency || 'INR';

  // Group members list
  const groupMembers = activeGroup.members && activeGroup.members.length > 0
    ? activeGroup.members
    : members.filter((m) =>
        (activeGroup.memberIds || []).includes(m.id)
      );

  // Determine current active user in the group
  let currentMember = null;
  if (currentUser) {
    currentMember = groupMembers.find(
      (m) => m.userId === currentUser.id || m.name?.toLowerCase().includes(currentUser.username.toLowerCase())
    );
  }
  if (!currentMember) {
    currentMember = groupMembers[0] || {
      id: 'm_guest',
      name: currentUser?.display_name || 'You',
      emoji: currentUser?.emoji || '⚡',
      color: currentUser?.color || '#FF2E93',
    };
  }

  // Mathematical Calculations in group currency
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
  const userNetBalance = netBalances[currentMember.id] || 0;
  const userConsumedShare = expenses.reduce((acc, exp) => {
    if (exp.splits && exp.splits[currentMember.id] !== undefined) {
      return acc + Number(exp.splits[currentMember.id]);
    }
    return acc;
  }, 0);

  // Push undo snapshot
  const pushUndoSnapshot = () => {
    setUndoStack((prev) => [
      ...prev.slice(-10),
      {
        groups: JSON.parse(JSON.stringify(groups)),
        activities: JSON.parse(JSON.stringify(activities)),
      },
    ]);
  };

  // ==========================================
  // ACTION HANDLERS (Online API or Offline Local)
  // ==========================================

  // Save Expense (Add or Edit)
  const handleSaveExpense = async (expenseData) => {
    if (currentUser) {
      try {
        if (expenseData.id && editingExpense) {
          await api.updateExpense(activeGroupId, expenseData.id, expenseData);
        } else {
          await api.createExpense(activeGroupId, expenseData);
        }
        await fetchActiveGroupDetails();
      } catch (err) {
        sounds.playBuzzer();
        alert(`Failed to save expense: ${err.message}`);
      }
    } else {
      // Offline fallback
      pushUndoSnapshot();
      const isEdit = Boolean(editingExpense);
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== activeGroupId) return g;
          const newExp = isEdit
            ? (g.expenses || []).map((e) => (e.id === expenseData.id ? expenseData : e))
            : [expenseData, ...(g.expenses || [])];
          return { ...g, expenses: newExp };
        })
      );
    }
    setEditingExpense(null);
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId) => {
    if (currentUser) {
      try {
        await api.deleteExpense(activeGroupId, expenseId);
        await fetchActiveGroupDetails();
      } catch (err) {
        sounds.playBuzzer();
        alert(`Failed to delete expense: ${err.message}`);
      }
    } else {
      pushUndoSnapshot();
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== activeGroupId) return g;
          return {
            ...g,
            expenses: (g.expenses || []).filter((e) => e.id !== expenseId),
          };
        })
      );
    }
  };

  // Record Settlement
  const handleRecordSettlement = async (settlementData) => {
    if (currentUser) {
      try {
        await api.createSettlement(activeGroupId, settlementData);
        await fetchActiveGroupDetails();
      } catch (err) {
        sounds.playBuzzer();
        alert(`Failed to record settlement: ${err.message}`);
      }
    } else {
      pushUndoSnapshot();
      const stl = {
        ...settlementData,
        id: `stl_${Date.now()}`,
        from: settlementData.from_member,
        to: settlementData.to_member,
      };
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== activeGroupId) return g;
          return {
            ...g,
            settlements: [stl, ...(g.settlements || [])],
          };
        })
      );
    }
    setSettlePrefill(null);
  };

  // Undo Last Action
  const handleUndoLastAction = async () => {
    if (currentUser) {
      try {
        await api.undoAction(activeGroupId);
        await fetchActiveGroupDetails();
        sounds.playSuccess();
      } catch (err) {
        sounds.playBuzzer();
        alert(`Failed to undo: ${err.message}`);
      }
    } else {
      if (undoStack.length === 0) return;
      const last = undoStack[undoStack.length - 1];
      setUndoStack((prev) => prev.slice(0, -1));
      setGroups(last.groups);
      setActivities(last.activities);
      sounds.playSuccess();
    }
  };

  // Create or Edit Group
  const handleSaveGroup = async (groupData) => {
    if (currentUser) {
      try {
        if (groupToEdit) {
          // If editing name/palette, update locally or via endpoint
          setGroups((prev) =>
            prev.map((g) => (g.id === groupData.id ? { ...g, ...groupData } : g))
          );
        } else {
          const res = await api.createGroup(groupData);
          if (res.group) {
            setGroups((prev) => [res.group, ...prev]);
            setActiveGroupId(res.group.id);
          }
        }
      } catch (err) {
        sounds.playBuzzer();
        alert(`Failed to save group: ${err.message}`);
      }
    } else {
      pushUndoSnapshot();
      const isEdit = Boolean(groupToEdit);
      if (isEdit) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupData.id ? { ...g, ...groupData } : g))
        );
      } else {
        const newG = {
          ...groupData,
          id: `grp_${Date.now()}`,
          expenses: [],
          settlements: [],
        };
        setGroups((prev) => [...prev, newG]);
        setActiveGroupId(newG.id);
      }
    }
    setGroupToEdit(null);
  };

  // Delete Group (creator only)
  const handleDeleteGroup = async (groupIdToDelete) => {
    if (currentUser) {
      try {
        await api.deleteGroup(groupIdToDelete);
        const remaining = groups.filter((g) => g.id !== groupIdToDelete);
        setGroups(remaining);
        if (remaining.length > 0) setActiveGroupId(remaining[0].id);
        sounds.playSuccess();
      } catch (err) {
        sounds.playBuzzer();
        alert(`Delete failed: ${err.message}`);
      }
    } else {
      if (groups.length <= 1) {
        sounds.playBuzzer();
        alert('You must keep at least one group in the tracker!');
        return;
      }
      pushUndoSnapshot();
      const remaining = groups.filter((g) => g.id !== groupIdToDelete);
      setGroups(remaining);
      setActiveGroupId(remaining[0].id);
      sounds.playSuccess();
    }
  };

  // Add Member
  const handleAddNewMember = async (newMember) => {
    if (currentUser) {
      try {
        await api.addMember(activeGroupId, {
          display_name: newMember.name,
          emoji: newMember.emoji,
          color: newMember.color,
        });
        await fetchActiveGroupDetails();
      } catch (err) {
        sounds.playBuzzer();
        alert(`Could not add member: ${err.message}`);
      }
    } else {
      setMembers((prev) => [...prev, newMember]);
    }
  };

  // Import Local Data into Neon account
  const handleImportLocalData = async () => {
    try {
      const localGroups = JSON.parse(localStorage.getItem(STORAGE_KEY_GROUPS) || '[]');
      const localMembers = JSON.parse(localStorage.getItem(STORAGE_KEY_MEMBERS) || '[]');
      if (localGroups.length === 0) {
        alert('No local data found in this browser to import.');
        return;
      }
      await api.importLocalData(localGroups, localMembers);
      // Clean up localStorage to prevent duplicate imports
      localStorage.removeItem(STORAGE_KEY_GROUPS);
      localStorage.removeItem(STORAGE_KEY_MEMBERS);
      await fetchUserGroups();
      alert('Local data successfully imported into your Neon cloud account!');
    } catch (err) {
      sounds.playBuzzer();
      alert(`Import failed: ${err.message}`);
    }
  };

  // Load Demo Group into Neon account
  const handleLoadDemoGroup = async () => {
    if (currentUser) {
      try {
        const res = await api.loadDemoGroup();
        if (res.group) {
          setGroups((prev) => [res.group, ...prev]);
          setActiveGroupId(res.group.id);
          await fetchActiveGroupDetails();
        }
      } catch (err) {
        sounds.playBuzzer();
        alert(`Failed to load demo group: ${err.message}`);
      }
    } else {
      // Reset local demo data
      setGroups(INITIAL_GROUPS);
      setMembers(INITIAL_MEMBERS);
      setActivities(INITIAL_ACTIVITY);
      setActiveGroupId('grp_goa');
      setUndoStack([]);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      setGroups(INITIAL_GROUPS);
      setMembers(INITIAL_MEMBERS);
      setActiveGroupId('grp_goa');
      sounds.playSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] dark:bg-[#0B0C10] text-[#0F0F14] dark:text-white transition-colors pb-24 sm:pb-16 selection:bg-[#FFE600] selection:text-black">
      
      {/* 1. TOP MARQUEE TICKER */}
      <MarqueeTicker
        totalSpend={totalGroupSpend}
        youOwe={userNetBalance < -0.005 ? Math.abs(userNetBalance) : 0}
        youGetBack={userNetBalance > 0.005 ? userNetBalance : 0}
        activeGroupName={activeGroup.name}
        expenseCount={expenses.length}
        groupCurrency={groupCurrency}
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
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenJoinGroup={() => setIsJoinModalOpen(true)}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        onOpenActivity={() => setIsActivityOpen(true)}
        onLoadDemoGroup={handleLoadDemoGroup}
        onImportLocalData={handleImportLocalData}
        hasLocalData={hasLocalData}
      />

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">
        
        {/* Active Group Hero Badge Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="text-2xl sm:text-3xl p-2 border-3 border-black rounded-lg brutal-shadow-sm -rotate-2 min-h-[44px] flex items-center justify-center"
              style={{ backgroundColor: activeGroup.signatureColor || activeGroup.signature_color || '#FF7A00' }}
            >
              {activeGroup.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-3xl text-black dark:text-white tracking-wide">
                  {activeGroup.name}
                </h1>
                <span className="text-xs font-mono-numbers px-2 py-0.5 border border-black bg-[#B6FF00] text-black rounded font-bold">
                  {groupMembers.length} MEMBERS
                </span>
                <span className="text-xs font-mono-numbers px-2 py-0.5 border border-black bg-[#FFE600] text-black rounded font-bold">
                  {groupCurrency}
                </span>
                {(activeGroup.inviteCode || activeGroup.invite_code) && (
                  <button
                    onClick={() => {
                      const code = activeGroup.inviteCode || activeGroup.invite_code;
                      navigator.clipboard.writeText(code);
                      sounds.playSuccess();
                      alert(`Invite code copied: ${code}`);
                    }}
                    title="Click to copy invite code"
                    className="text-xs font-mono-numbers px-2 py-0.5 border border-black bg-[#00F0FF] text-black rounded font-bold hover:bg-[#4cf2ff] brutal-btn"
                  >
                    CODE: {activeGroup.inviteCode || activeGroup.invite_code}
                  </button>
                )}
              </div>
              <p className="text-xs font-handwriting text-gray-600 dark:text-gray-300">
                Logged in as <strong>{currentMember.name}</strong> • 100% integer paise precision
              </p>
            </div>
          </div>

          {/* Quick Action Pill Buttons (Min 40x40px tap target) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playPop();
                setSettlePrefill(null);
                setIsSettleOpen(true);
              }}
              className="bg-[#B6FF00] hover:bg-[#caff43] text-black font-heading text-xs px-3.5 py-2.5 border-2 border-black brutal-shadow-sm brutal-btn rounded uppercase flex items-center gap-1.5 min-h-[40px]"
            >
              <span>💸 Settle Up</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setEditingExpense(null);
                setIsAddExpenseOpen(true);
              }}
              className="bg-[#FFE600] hover:bg-[#fff04d] text-black font-heading text-xs px-3.5 py-2.5 border-2 border-black brutal-shadow-sm brutal-btn rounded uppercase flex items-center gap-1.5 min-h-[40px]"
            >
              <span>+ Add Expense</span>
            </button>
          </div>
        </div>

        {/* Desktop View & Mobile Tab Router */}
        <div className="space-y-6">
          
          {/* Dashboard Stats Bento Bar */}
          <div className={`transition-all ${mobileTab !== 'dashboard' ? 'hidden sm:block' : 'block'}`}>
            <DashboardStats
              totalGroupSpend={totalGroupSpend}
              userConsumedShare={userConsumedShare}
              userNetBalance={userNetBalance}
              currentMember={currentMember}
              expenseCount={expenses.length}
              groupCurrency={groupCurrency}
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

          {/* Balances & Debt Minimization Section */}
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

          {/* Expenses List & Filters Section */}
          <div className={`transition-all ${mobileTab !== 'expenses' ? 'hidden sm:block' : 'block'}`}>
            <ExpensesList
              expenses={expenses}
              members={groupMembers}
              groupCurrency={groupCurrency}
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
      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          fetchUserGroups();
        }}
        api={api}
      />

      {/* Join Group with Invite Code Modal */}
      <JoinGroupModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinSuccess={(joinedGroup) => {
          fetchUserGroups();
          if (joinedGroup) setActiveGroupId(joinedGroup.id);
        }}
        api={api}
      />

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
        groupCurrency={groupCurrency}
      />

      {/* Settle Up Modal */}
      <SettleUpModal
        isOpen={isSettleOpen}
        onClose={() => {
          setIsSettleOpen(false);
          setSettlePrefill(null);
        }}
        members={groupMembers}
        bilateralDebts={bilateralDebts}
        groupCurrency={groupCurrency}
        onRecordSettlement={handleRecordSettlement}
        prefill={settlePrefill}
      />

      {/* Activity Feed Modal */}
      <ActivityFeedModal
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        activities={activities}
        onUndoLastAction={handleUndoLastAction}
        canUndo={currentUser ? activities.length > 0 : undoStack.length > 0}
        groupCurrency={groupCurrency}
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
        currentUserId={currentUser?.id}
      />

    </div>
  );
}
