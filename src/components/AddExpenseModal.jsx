import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../utils/constants';
import {
  calculateSplits,
  toRupees,
  formatCurrency,
  CURRENCY_SYMBOLS,
  validateAmount,
  MAX_AMOUNT,
} from '../utils/expenseLogic';
import {
  X,
  Wallet,
  Users,
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function AddExpenseModal({
  isOpen,
  onClose,
  onSaveExpense,
  members = [],
  editingExpense = null,
  groupCurrency = 'INR',
}) {
  // Form States
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Payer States: single vs multi
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState(members[0]?.id || '');
  const [multiPayerAmounts, setMultiPayerAmounts] = useState({});

  // Split Method: 'equal' | 'exact' | 'percentage' | 'shares'
  const [splitMethod, setSplitMethod] = useState('equal');
  const [selectedMemberIds, setSelectedMemberIds] = useState(members.map((m) => m.id));

  // Custom Split Values per method
  const [exactValues, setExactValues] = useState({});
  const [percentageValues, setPercentageValues] = useState({});
  const [shareValues, setShareValues] = useState({});
  const [amountError, setAmountError] = useState('');

  // Initialize or populate if editing
  useEffect(() => {
    if (!isOpen) return;
    if (editingExpense) {
      setDescription(editingExpense.description || '');
      setAmount(editingExpense.amount ? String(editingExpense.amount) : '');
      setCategory(editingExpense.category || 'food');
      setDate(editingExpense.date || new Date().toISOString().split('T')[0]);
      setNotes(editingExpense.notes || '');
      setIsMultiPayer(Boolean(editingExpense.isMultiPayer));

      if (editingExpense.isMultiPayer && editingExpense.payers) {
        setMultiPayerAmounts(editingExpense.payers);
      } else {
        setSinglePayerId(editingExpense.paidBy || members[0]?.id || '');
      }

      setSplitMethod(editingExpense.splitMethod || 'equal');

      if (editingExpense.splits) {
        const participantIds = Object.keys(editingExpense.splits);
        setSelectedMemberIds(participantIds);
        setExactValues(editingExpense.splits);
      }

      if (editingExpense.splitPercentages) {
        setPercentageValues(editingExpense.splitPercentages);
      }
      if (editingExpense.splitShares) {
        setShareValues(editingExpense.splitShares);
      }
    } else {
      // Default reset
      setDescription('');
      setAmount('');
      setCategory('food');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setIsMultiPayer(false);
      setSinglePayerId(members[0]?.id || '');
      setSplitMethod('equal');
      setSelectedMemberIds(members.map((m) => m.id));

      // Defaults for percentages and shares
      const defaultPcts = {};
      const defaultShares = {};
      const defaultExact = {};
      const evenPct = members.length > 0 ? (100 / members.length).toFixed(1) : 0;
      members.forEach((m) => {
        defaultPcts[m.id] = evenPct;
        defaultShares[m.id] = 1;
        defaultExact[m.id] = '';
      });
      setPercentageValues(defaultPcts);
      setShareValues(defaultShares);
      setExactValues(defaultExact);

      // Default multi-payer
      const defaultMulti = {};
      members.forEach((m) => {
        defaultMulti[m.id] = '';
      });
      setMultiPayerAmounts(defaultMulti);
    }
    setAmountError('');
  }, [editingExpense, isOpen]);

  if (!isOpen) return null;

  // Handle Amount validation
  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    if (val) {
      const v = validateAmount(val);
      if (!v.isValid) {
        setAmountError(v.error);
      } else {
        setAmountError('');
      }
    } else {
      setAmountError('');
    }
  };

  // Handle Multi-Payer Validation
  const totalAmountNum = Number(amount) || 0;
  let payerSum = 0;
  if (isMultiPayer) {
    payerSum = Object.values(multiPayerAmounts).reduce((acc, v) => acc + (Number(v) || 0), 0);
  } else {
    payerSum = totalAmountNum;
  }
  const payerDifference = totalAmountNum - payerSum;
  const isPayerValid = !isMultiPayer || Math.abs(payerDifference) < 0.01;

  // Live Split Calculations & Math Validation
  const splitResult = calculateSplits({
    totalAmount: totalAmountNum,
    splitMethod,
    selectedMemberIds,
    exactValues,
    percentageValues,
    shareValues,
  });

  // Toggle member inclusion
  const handleToggleMember = (mId) => {
    sounds.playPop();
    if (selectedMemberIds.includes(mId)) {
      if (selectedMemberIds.length === 1) return; // keep at least 1
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== mId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, mId]);
    }
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      sounds.playBuzzer();
      alert('Please enter a description for this expense.');
      return;
    }

    const valCheck = validateAmount(amount);
    if (!valCheck.isValid) {
      sounds.playBuzzer();
      setAmountError(valCheck.error);
      return;
    }

    if (!isPayerValid) {
      sounds.playBuzzer();
      alert(`Multi-payer amounts must equal total ${formatCurrency(totalAmountNum, groupCurrency)}. Difference: ${formatCurrency(payerDifference, groupCurrency)}`);
      return;
    }
    if (!splitResult.isValid) {
      sounds.playBuzzer();
      alert(splitResult.error || 'Please make sure all splits balance out perfectly.');
      return;
    }

    // Convert splits from paise to float
    const finalSplits = {};
    Object.entries(splitResult.owedPaise).forEach(([mId, paise]) => {
      finalSplits[mId] = toRupees(paise);
    });

    const expensePayload = {
      id: editingExpense?.id,
      description: description.trim(),
      amount: totalAmountNum,
      amount_paise: Math.round(totalAmountNum * 100).toString(),
      currency: groupCurrency,
      date,
      category,
      isMultiPayer,
      paidBy: isMultiPayer ? null : singlePayerId,
      payers: isMultiPayer
        ? Object.entries(multiPayerAmounts).map(([mId, amt]) => ({
            member_id: mId,
            amount_paise: Math.round(Number(amt) * 100).toString(),
          }))
        : [{ member_id: singlePayerId, amount_paise: Math.round(totalAmountNum * 100).toString() }],
      splitMethod: splitMethod,
      split_method: splitMethod,
      splitPercentages: splitMethod === 'percentage' ? percentageValues : null,
      splitShares: splitMethod === 'shares' ? shareValues : null,
      splits: Object.entries(splitResult.owedPaise).map(([mId, paise]) => ({
        member_id: mId,
        amount_paise: paise.toString(),
        share_value: splitMethod === 'shares' ? shareValues[mId] : splitMethod === 'percentage' ? percentageValues[mId] : null,
      })),
      notes: notes.trim(),
    };

    sounds.playSuccess();
    onSaveExpense(expensePayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#161722] border-4 border-black dark:border-[#FFE600] rounded-xl brutal-shadow-xl overflow-hidden my-8 animate-in fade-in duration-200">
        
        {/* Washi tape topper */}
        <div className="washi-tape-top"></div>

        {/* Modal Header */}
        <div className="bg-[#FFE600] dark:bg-[#FF2E93] text-black border-b-3 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg sm:text-xl">
              {editingExpense ? '⚡ EDIT EXPENSE' : '⚡ RECORD EXPENSE'}
            </span>
          </div>

          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="p-1 border-2 border-black bg-white text-black hover:bg-black hover:text-white rounded brutal-btn min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Row 1: Description & Amount (One currency per group) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <input
                type="text"
                placeholder="e.g. Dinner, Villa, Uber..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-sm font-bold font-body text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF2E93] min-h-[40px]"
              />
            </div>

            <div className="sm:col-span-5">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300">
                  Amount ({CURRENCY_SYMBOLS[groupCurrency] || groupCurrency}) *
                </label>
                <span className="text-[10px] font-mono-numbers text-gray-400">
                  Max: {formatCurrency(MAX_AMOUNT, groupCurrency)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-mono-numbers font-bold text-gray-500">
                  {CURRENCY_SYMBOLS[groupCurrency] || groupCurrency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={MAX_AMOUNT}
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  required
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-sm font-mono-numbers font-extrabold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B6FF00] min-h-[40px]"
                />
              </div>
              {amountError && (
                <div className="text-xs text-[#FF2E93] font-bold font-mono-numbers mt-1 animate-shake">
                  🚨 {amountError}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Category Selector */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => {
                      sounds.playPop();
                      setCategory(cat.id);
                    }}
                    className={`p-2 border-2 border-black rounded text-xs font-bold font-body flex items-center gap-2 transition-all min-h-[40px] ${
                      isSelected
                        ? 'bg-[#00F0FF] text-black brutal-shadow-sm -translate-y-0.5'
                        : 'bg-white dark:bg-[#202230] text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-base">{cat.emoji}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white focus:outline-none min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Optional Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Paid using card"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-xs font-body text-black dark:text-white focus:outline-none min-h-[40px]"
              />
            </div>
          </div>

          {/* Row 4: Paid By (Single vs Multiple Payers) */}
          <div className="p-3 bg-gray-50 dark:bg-[#1C1E2B] border-2 border-black rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-heading uppercase text-black dark:text-white flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#FF7A00]" /> Paid By
              </span>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setIsMultiPayer(!isMultiPayer);
                }}
                className="text-[11px] font-mono-numbers font-bold underline text-[#FF2E93] hover:text-[#e0207e] min-h-[40px] flex items-center"
              >
                {isMultiPayer ? 'Switch to Single Payer' : 'Multiple People Paid?'}
              </button>
            </div>

            {!isMultiPayer ? (
              <select
                aria-label="Select payer"
                value={singlePayerId}
                onChange={(e) => setSinglePayerId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#252838] border-2 border-black rounded text-sm font-bold text-black dark:text-white min-h-[40px]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 mt-2">
                <div className="text-[11px] font-mono-numbers text-gray-500">
                  Enter how much each person contributed (Total must equal {formatCurrency(totalAmountNum, groupCurrency)}):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="text-xs font-bold w-24 truncate dark:text-white">
                        {m.emoji} {m.name}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={multiPayerAmounts[m.id] || ''}
                        onChange={(e) =>
                          setMultiPayerAmounts({
                            ...multiPayerAmounts,
                            [m.id]: e.target.value,
                          })
                        }
                        className="flex-1 px-2 py-1.5 bg-white dark:bg-[#252838] border-2 border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white min-h-[36px]"
                      />
                    </div>
                  ))}
                </div>

                {/* Multi-payer validation alert */}
                <div
                  className={`text-xs font-mono-numbers font-bold p-2 border border-black rounded flex items-center justify-between ${
                    isPayerValid ? 'bg-[#B6FF00] text-black' : 'bg-[#FF2E93] text-white'
                  }`}
                >
                  <span>Entered Sum: {formatCurrency(payerSum, groupCurrency)}</span>
                  <span>
                    {isPayerValid
                      ? '✓ Matches Total'
                      : `Difference: ${formatCurrency(payerDifference, groupCurrency)}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 5: Split Method & Selection */}
          <div className="p-3 bg-gray-50 dark:bg-[#1C1E2B] border-2 border-black rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-heading uppercase text-black dark:text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#00F0FF]" /> Split Method
              </span>

              {/* Split Tabs */}
              <div className="flex bg-white dark:bg-[#252838] border-2 border-black p-0.5 rounded text-xs font-mono-numbers font-bold">
                {['equal', 'exact', 'percentage', 'shares'].map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => {
                      sounds.playPop();
                      setSplitMethod(m);
                    }}
                    className={`px-3 py-1.5 rounded capitalize transition-all min-h-[36px] ${
                      splitMethod === m
                        ? 'bg-[#B6FF00] text-black border border-black'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants Checklist & Custom Values */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono-numbers text-gray-500">
                Check participants to include in this expense:
              </div>

              <div className="space-y-1.5">
                {members.map((m) => {
                  const isIncluded = selectedMemberIds.includes(m.id);
                  const computedShare = splitResult.owedPaise[m.id]
                    ? toRupees(splitResult.owedPaise[m.id])
                    : 0;

                  return (
                    <div
                      key={m.id}
                      className={`p-2 border-2 border-black rounded flex items-center justify-between gap-2 transition-all min-h-[40px] ${
                        isIncluded
                          ? 'bg-white dark:bg-[#202230]'
                          : 'bg-gray-200 dark:bg-[#151620] opacity-50'
                      }`}
                    >
                      {/* Checkbox & Member name */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => handleToggleMember(m.id)}
                          className="w-4 h-4 accent-[#FF2E93] cursor-pointer"
                        />
                        <span className="text-xs font-bold font-body text-black dark:text-white">
                          {m.emoji} {m.name}
                        </span>
                      </label>

                      {/* Custom inputs according to split method */}
                      {isIncluded && (
                        <div className="flex items-center gap-2">
                          {splitMethod === 'exact' && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono-numbers text-gray-500">
                                {CURRENCY_SYMBOLS[groupCurrency] || groupCurrency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={exactValues[m.id] || ''}
                                onChange={(e) =>
                                  setExactValues({ ...exactValues, [m.id]: e.target.value })
                                }
                                className="w-24 px-2 py-1 bg-gray-50 dark:bg-[#252838] border border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white"
                              />
                            </div>
                          )}

                          {splitMethod === 'percentage' && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="0"
                                value={percentageValues[m.id] || ''}
                                onChange={(e) =>
                                  setPercentageValues({ ...percentageValues, [m.id]: e.target.value })
                                }
                                className="w-16 px-2 py-1 bg-gray-50 dark:bg-[#252838] border border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white"
                              />
                              <span className="text-xs font-mono-numbers font-bold dark:text-white">%</span>
                            </div>
                          )}

                          {splitMethod === 'shares' && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                placeholder="1"
                                value={shareValues[m.id] ?? 1}
                                onChange={(e) =>
                                  setShareValues({ ...shareValues, [m.id]: e.target.value })
                                }
                                className="w-14 px-2 py-1 bg-gray-50 dark:bg-[#252838] border border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white"
                              />
                              <span className="text-xs font-mono-numbers font-bold dark:text-white">shares</span>
                            </div>
                          )}

                          {/* Computed resulting share */}
                          <span className="font-mono-numbers text-xs font-extrabold text-[#FF2E93] min-w-[70px] text-right">
                            {formatCurrency(computedShare, groupCurrency)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Math / Balance Status Indicator */}
              <div
                className={`p-2.5 border-2 border-black rounded text-xs font-mono-numbers font-bold flex items-center justify-between mt-2 ${
                  splitResult.isValid
                    ? 'bg-[#B6FF00] text-black'
                    : 'bg-[#FF2E93] text-white animate-pulse'
                }`}
              >
                <span>
                  {splitResult.isValid
                    ? '✓ All Paise Distributed (100% Integer Precision)'
                    : `Remaining to allocate: ${formatCurrency(toRupees(splitResult.remainingPaise), groupCurrency)}`}
                </span>
                {splitResult.error && (
                  <span className="text-[10px] font-normal underline">
                    {splitResult.error}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t-2 border-black">
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                onClose();
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-heading text-xs border-2 border-black brutal-btn rounded min-h-[40px]"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={!splitResult.isValid || !isPayerValid || Boolean(amountError)}
              className={`px-5 py-2 font-heading text-xs border-3 border-black brutal-shadow brutal-btn rounded uppercase transition-all min-h-[40px] ${
                splitResult.isValid && isPayerValid && !amountError
                  ? 'bg-[#FFE600] text-black hover:bg-[#ffe01a]'
                  : 'bg-gray-400 text-gray-700 opacity-60 cursor-not-allowed'
              }`}
            >
              {editingExpense ? 'SAVE CHANGES' : 'RECORD EXPENSE ⚡'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
