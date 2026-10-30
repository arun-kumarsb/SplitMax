import React, { useState, useEffect } from 'react';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '../utils/demoData';
import { X, Plus, Trash2, Users, Palette, Copy, Check, Share2 } from 'lucide-react';
import { sounds } from '../utils/audio';

const GROUP_PALETTES = [
  { name: 'Tangerine Pop', color: '#FF7A00' },
  { name: 'Hot Pink', color: '#FF2E93' },
  { name: 'Acid Green', color: '#B6FF00' },
  { name: 'Electric Cyan', color: '#00F0FF' },
  { name: 'Cobalt Shock', color: '#2B2BFF' },
  { name: 'Neon Violet', color: '#8B2BFF' },
];

const GROUP_EMOJIS = ['🏖️', '🛋️', '🍕', '🎉', '✈️', '🏕️', '🍻', '🎮', '🚗', '🏔️', '🍔', '🎬'];

export default function GroupModal({
  isOpen,
  onClose,
  groupToEdit = null, // null for create
  allMembers = [],
  onSaveGroup,
  onDeleteGroup,
  onAddNewMember,
  currentUserId,
}) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏖️');
  const [signatureColor, setSignatureColor] = useState('#FF7A00');
  const [currency, setCurrency] = useState('INR');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [memberError, setMemberError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name || '');
      setEmoji(groupToEdit.emoji || '🏖️');
      setSignatureColor(groupToEdit.signatureColor || groupToEdit.signature_color || '#FF7A00');
      setCurrency(groupToEdit.currency || 'INR');
      const mIds = groupToEdit.members
        ? groupToEdit.members.map((m) => m.id)
        : groupToEdit.memberIds || [];
      setSelectedMemberIds(mIds);
    } else {
      setName('');
      setEmoji('🏖️');
      setSignatureColor('#FF7A00');
      setCurrency('INR');
      setSelectedMemberIds(allMembers.map((m) => m.id));
    }
    setNewMemberName('');
    setMemberError('');
    setCopiedCode(false);
  }, [groupToEdit, isOpen]);

  // Toggle member inclusion
  const handleToggleMember = (mId) => {
    sounds.playPop();
    if (selectedMemberIds.includes(mId)) {
      if (selectedMemberIds.length === 1) {
        sounds.playBuzzer();
        alert('A group must have at least one member!');
        return;
      }
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== mId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, mId]);
    }
  };

  // Add new member on the fly with trimmed, case-insensitive uniqueness check
  const handleCreateNewMember = (e) => {
    if (e) e.preventDefault();
    setMemberError('');

    const trimmed = newMemberName.trim();
    if (!trimmed) return;

    // Check case-insensitive uniqueness within group
    const isDuplicate = allMembers
      .filter((m) => selectedMemberIds.includes(m.id))
      .some((m) => m.name.trim().toLowerCase() === trimmed.toLowerCase());

    if (isDuplicate) {
      sounds.playBuzzer();
      setMemberError(`A member named "${trimmed}" already exists in this group.`);
      return;
    }

    sounds.playSuccess();
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const randomEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

    const createdMember = {
      id: `m_${Date.now()}`,
      name: trimmed,
      display_name: trimmed,
      emoji: randomEmoji,
      color: randomColor,
      isUser: false,
    };

    onAddNewMember(createdMember);
    setSelectedMemberIds((prev) => [...prev, createdMember.id]);
    setNewMemberName('');
  };

  const handleCopyInvite = () => {
    if (groupToEdit?.inviteCode || groupToEdit?.invite_code) {
      const code = groupToEdit.inviteCode || groupToEdit.invite_code;
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      sounds.playSuccess();
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      sounds.playBuzzer();
      alert('Please enter a group name.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      sounds.playBuzzer();
      alert('Please select at least one member for the group.');
      return;
    }

    sounds.playSuccess();
    const groupPayload = {
      id: groupToEdit?.id,
      name: name.trim(),
      emoji,
      signature_color: signatureColor,
      signatureColor,
      currency,
      memberIds: selectedMemberIds,
      initial_members: allMembers
        .filter((m) => selectedMemberIds.includes(m.id))
        .map((m) => ({ name: m.name, emoji: m.emoji, color: m.color })),
    };

    onSaveGroup(groupPayload);
    onClose();
  };

  const isCreator = !groupToEdit || !groupToEdit.createdBy || groupToEdit.createdBy === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#161722] border-4 border-black dark:border-[#FF7A00] rounded-xl brutal-shadow-xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Washi tape topper */}
        <div className="washi-tape-top"></div>

        {/* Modal Header */}
        <div
          className="text-black border-b-3 border-black p-4 flex items-center justify-between"
          style={{ backgroundColor: signatureColor }}
        >
          <div className="flex items-center gap-2">
            <span className="font-display text-lg sm:text-xl">
              {groupToEdit ? '⚡ EDIT GROUP' : '⚡ CREATE NEW GROUP'}
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Invite Code Badge if editing */}
          {(groupToEdit?.inviteCode || groupToEdit?.invite_code) && (
            <div className="p-2.5 bg-[#00F0FF] text-black border-2 border-black rounded flex items-center justify-between brutal-shadow-sm">
              <div className="text-xs font-mono-numbers font-bold">
                INVITE CODE:{' '}
                <span className="text-base font-extrabold ml-1">
                  {groupToEdit.inviteCode || groupToEdit.invite_code}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="bg-black text-white px-2.5 py-1.5 text-xs font-heading rounded border border-black brutal-btn flex items-center gap-1 min-h-[40px]"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'COPIED!' : 'COPY'}</span>
              </button>
            </div>
          )}

          {/* Group Name & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Goa Trip, Flat 402, Hackathon..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-sm font-bold font-body text-black dark:text-white focus:outline-none min-h-[40px]"
              />
            </div>

            {/* Currency (One Currency Per Group) */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                aria-label="Group Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-xs font-mono-numbers font-bold text-black dark:text-white focus:outline-none min-h-[40px]"
              >
                <option value="INR">₹ INR (Rupees)</option>
                <option value="USD">$ USD (Dollars)</option>
                <option value="EUR">€ EUR (Euros)</option>
                <option value="GBP">£ GBP (Pounds)</option>
              </select>
            </div>
          </div>

          {/* Group Emoji Selection */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
              Pick Group Emoji
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {GROUP_EMOJIS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => {
                    sounds.playPop();
                    setEmoji(e);
                  }}
                  className={`w-10 h-10 text-lg border-2 border-black rounded flex items-center justify-center transition-all min-h-[40px] min-w-[40px] ${
                    emoji === e
                      ? 'bg-[#FFE600] scale-110 brutal-shadow-sm'
                      : 'bg-white dark:bg-[#202230] hover:bg-gray-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Signature Palette */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Signature Color Scheme
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {GROUP_PALETTES.map((pal) => (
                <button
                  type="button"
                  key={pal.color}
                  onClick={() => {
                    sounds.playPop();
                    setSignatureColor(pal.color);
                  }}
                  className={`px-3 py-2 text-xs font-mono-numbers font-bold border-2 border-black rounded flex items-center gap-1.5 transition-all min-h-[40px] ${
                    signatureColor === pal.color
                      ? 'brutal-shadow-sm -translate-y-0.5 ring-2 ring-black'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: pal.color, color: '#000' }}
                >
                  <span>{pal.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Members in Group */}
          <div className="p-3 bg-gray-50 dark:bg-[#1E1F2A] border-2 border-black rounded-lg space-y-3">
            <span className="text-xs font-heading uppercase text-black dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#00F0FF]" /> Group Members
            </span>

            {/* Member toggle list */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {allMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleMember(m.id)}
                    className={`p-2 border-2 border-black rounded flex items-center justify-between cursor-pointer transition-all min-h-[40px] ${
                      isSelected
                        ? 'bg-white dark:bg-[#252838]'
                        : 'bg-gray-200 dark:bg-[#151620] opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full border border-black flex items-center justify-center text-xs shadow-xs"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.emoji}
                      </div>
                      <span className="text-xs font-bold text-black dark:text-white">
                        {m.name}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono-numbers font-bold px-2 py-1 rounded border border-black ${
                        isSelected ? 'bg-[#B6FF00] text-black' : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isSelected ? 'INCLUDED' : 'EXCLUDED'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick add person by name - Enter adds member and keeps dialog open */}
            <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700">
              {memberError && (
                <div className="text-xs text-[#FF2E93] font-bold font-mono-numbers mb-1.5 animate-shake">
                  🚨 {memberError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add person by name (e.g. Maya)"
                  value={newMemberName}
                  onChange={(e) => {
                    setNewMemberName(e.target.value);
                    if (memberError) setMemberError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateNewMember(e);
                    }
                  }}
                  className="flex-1 px-2.5 py-2 bg-white dark:bg-[#252838] border-2 border-black rounded text-xs font-bold text-black dark:text-white focus:outline-none min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={handleCreateNewMember}
                  className="px-3.5 py-2 bg-[#B6FF00] hover:bg-[#cbfd43] text-black font-heading text-xs border-2 border-black rounded brutal-btn flex items-center gap-1 min-h-[40px]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>ADD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-between border-t-2 border-black">
            {groupToEdit && onDeleteGroup ? (
              isCreator ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete group "${groupToEdit.name}" and all its expenses?`)) {
                      sounds.playSuccess();
                      onDeleteGroup(groupToEdit.id);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 bg-[#FF2E93] text-white font-heading text-xs border-2 border-black rounded brutal-btn flex items-center gap-1.5 hover:bg-[#e41e7d] min-h-[40px]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>DELETE</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono-numbers text-gray-500">
                  Only creator can delete
                </span>
              )
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
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
                className="px-5 py-2 bg-[#FFE600] text-black font-heading text-xs border-3 border-black brutal-shadow brutal-btn rounded uppercase min-h-[40px]"
              >
                SAVE GROUP ⚡
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
