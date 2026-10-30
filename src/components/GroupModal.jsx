import React, { useState, useEffect } from 'react';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '../utils/demoData';
import { X, Plus, Trash2, Users, Palette, Smile } from 'lucide-react';
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
}) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏖️');
  const [signatureColor, setSignatureColor] = useState('#FF7A00');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name || '');
      setEmoji(groupToEdit.emoji || '🏖️');
      setSignatureColor(groupToEdit.signatureColor || '#FF7A00');
      setSelectedMemberIds(groupToEdit.memberIds || []);
    } else {
      setName('');
      setEmoji('🏖️');
      setSignatureColor('#FF7A00');
      // By default select all existing members
      setSelectedMemberIds(allMembers.map((m) => m.id));
    }
    setNewMemberName('');
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

  // Add new member on the fly
  const handleCreateNewMember = (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    sounds.playSuccess();
    // Auto assign color & emoji
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const randomEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

    const createdMember = {
      id: `m_${Date.now()}`,
      name: newMemberName.trim(),
      emoji: randomEmoji,
      color: randomColor,
      isUser: false,
    };

    onAddNewMember(createdMember);
    setSelectedMemberIds((prev) => [...prev, createdMember.id]);
    setNewMemberName('');
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
      id: groupToEdit?.id || `grp_${Date.now()}`,
      name: name.trim(),
      emoji,
      signatureColor,
      memberIds: selectedMemberIds,
      expenses: groupToEdit?.expenses || [],
      settlements: groupToEdit?.settlements || [],
    };

    onSaveGroup(groupPayload);
    onClose();
  };

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
            className="p-1 border-2 border-black bg-white text-black hover:bg-black hover:text-white rounded brutal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Group Name & Emoji Picker */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
              Group Name *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Goa Trip, Flat 402, Hackathon..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-sm font-bold font-body text-black dark:text-white focus:outline-none"
              />
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
                  className={`w-9 h-9 text-lg border-2 border-black rounded flex items-center justify-center transition-all ${
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
                  className={`px-3 py-1 text-xs font-mono-numbers font-bold border-2 border-black rounded flex items-center gap-1.5 transition-all ${
                    signatureColor === pal.color
                      ? 'brutal-shadow-sm -translate-y-0.5'
                      : 'opacity-70 hover:opacity-100'
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
                    className={`p-2 border-2 border-black rounded flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-[#252838]'
                        : 'bg-gray-200 dark:bg-[#151620] opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border border-black flex items-center justify-center text-xs shadow-xs"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.emoji}
                      </div>
                      <span className="text-xs font-bold text-black dark:text-white">
                        {m.name}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono-numbers font-bold px-1.5 py-0.5 rounded border border-black ${
                        isSelected ? 'bg-[#B6FF00] text-black' : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isSelected ? 'INCLUDED' : 'EXCLUDED'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick add person by name */}
            <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add person by name (e.g. Maya)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white dark:bg-[#252838] border-2 border-black rounded text-xs font-bold text-black dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateNewMember}
                  className="px-3 py-1.5 bg-[#B6FF00] hover:bg-[#cbfd43] text-black font-heading text-xs border-2 border-black rounded brutal-btn flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-between border-t-2 border-black">
            {groupToEdit && onDeleteGroup ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete group "${groupToEdit.name}" and all its expenses?`)) {
                    sounds.playSuccess();
                    onDeleteGroup(groupToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-[#FF2E93] text-white font-heading text-xs border-2 border-black rounded brutal-btn flex items-center gap-1 hover:bg-[#e41e7d]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE</span>
              </button>
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
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-heading text-xs border-2 border-black brutal-btn rounded"
              >
                CANCEL
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 bg-[#FFE600] text-black font-heading text-xs border-3 border-black brutal-shadow brutal-btn rounded uppercase"
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
