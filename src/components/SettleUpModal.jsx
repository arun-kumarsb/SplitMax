import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { formatCurrency } from '../utils/expenseLogic';
import { X, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function SettleUpModal({
  isOpen,
  onClose,
  members = [],
  onRecordSettlement,
  prefill = null, // { from, to, amount }
}) {
  if (!isOpen) return null;

  const [fromMemberId, setFromMemberId] = useState(members[0]?.id || '');
  const [toMemberId, setToMemberId] = useState(members[1]?.id || members[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('UPI instant transfer');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (prefill) {
      if (prefill.from) setFromMemberId(prefill.from);
      if (prefill.to) setToMemberId(prefill.to);
      if (prefill.amount) setAmount(String(prefill.amount));
    }
  }, [prefill, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) {
      sounds.playBuzzer();
      alert('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (fromMemberId === toMemberId) {
      sounds.playBuzzer();
      alert('Sender and receiver cannot be the same person.');
      return;
    }

    // Trigger confetti explosion!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF2E93', '#FFE600', '#B6FF00', '#00F0FF', '#8B2BFF'],
    });

    // Sound effect
    sounds.playSuccess();

    const settlementPayload = {
      id: `stl_${Date.now()}`,
      from: fromMemberId,
      to: toMemberId,
      amount: val,
      date,
      notes: notes.trim(),
    };

    onRecordSettlement(settlementPayload);
    onClose();
  };

  const fromMember = members.find((m) => m.id === fromMemberId);
  const toMember = members.find((m) => m.id === toMemberId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#161722] border-4 border-black dark:border-[#B6FF00] rounded-xl brutal-shadow-xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Washi tape topper */}
        <div className="washi-tape-top"></div>

        {/* Header */}
        <div className="bg-[#B6FF00] text-black border-b-3 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg sm:text-xl">
              💸 RECORD SETTLEMENT
            </span>
          </div>

          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="p-1 border-2 border-black bg-white text-black hover:bg-black hover:text-white rounded brutal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          
          {/* Visual Transfer Flow Pill */}
          <div className="p-3 bg-gray-50 dark:bg-[#1E1F2A] border-2 border-black rounded-lg flex items-center justify-center gap-3">
            <div className="text-center">
              <div
                className="w-10 h-10 rounded-full border-2 border-black mx-auto flex items-center justify-center text-lg font-bold shadow-sm"
                style={{ backgroundColor: fromMember?.color || '#FFE600' }}
              >
                {fromMember?.emoji}
              </div>
              <span className="text-xs font-heading mt-1 block dark:text-white">
                {fromMember?.name}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono-numbers font-bold text-gray-500 uppercase">
                PAYS
              </span>
              <ArrowRight className="w-5 h-5 text-[#FF2E93] animate-pulse" />
            </div>

            <div className="text-center">
              <div
                className="w-10 h-10 rounded-full border-2 border-black mx-auto flex items-center justify-center text-lg font-bold shadow-sm"
                style={{ backgroundColor: toMember?.color || '#00F0FF' }}
              >
                {toMember?.emoji}
              </div>
              <span className="text-xs font-heading mt-1 block dark:text-white">
                {toMember?.name}
              </span>
            </div>
          </div>

          {/* Member Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Who Paid?
              </label>
              <select
                aria-label="Who paid?"
                value={fromMemberId}
                onChange={(e) => setFromMemberId(e.target.value)}
                className="w-full px-2 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-xs font-bold text-black dark:text-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Who Received?
              </label>
              <select
                aria-label="Who received?"
                value={toMemberId}
                onChange={(e) => setToMemberId(e.target.value)}
                className="w-full px-2 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-xs font-bold text-black dark:text-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount Input & Presets */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-mono-numbers font-bold text-gray-500">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-base font-mono-numbers font-extrabold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B6FF00]"
              />
            </div>
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Payment Mode / Note
              </label>
              <input
                type="text"
                placeholder="GPay, Cash, UPI..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-xs font-body text-black dark:text-white"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t-2 border-black">
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                onClose();
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-heading text-xs border-2 border-black brutal-btn rounded"
            >
              CANCEL
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-[#B6FF00] hover:bg-[#c6ff3b] text-black font-heading text-xs border-3 border-black brutal-shadow brutal-btn rounded uppercase flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>RECORD PAYMENT 🎉</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
