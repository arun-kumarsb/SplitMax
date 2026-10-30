import React from 'react';
import { Volume2, VolumeX, Moon, Sun, Users, Plus, RotateCcw, History } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function Header({
  groups,
  activeGroupId,
  onSelectGroup,
  onOpenCreateGroup,
  onOpenEditGroup,
  members,
  currentUserId,
  onSelectUser,
  isDark,
  onToggleDark,
  isMuted,
  onToggleMute,
  onOpenActivity,
  onResetDemoData,
}) {
  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
  const currentUser = members.find((m) => m.id === currentUserId) || members[0];

  return (
    <header className="border-b-4 border-black bg-white dark:bg-[#0D0E15] dark:border-[#FFE600] transition-colors relative z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        {/* Top Brand & Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Tag */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => sounds.playSuccess()}>
              <div className="bg-[#FF2E93] text-black font-display text-xl sm:text-2xl px-3 py-1.5 border-3 border-black brutal-shadow-sm -rotate-2 transform group-hover:rotate-0 transition-transform">
                SPLIT//MAX
              </div>
              <div className="absolute -top-3 -right-3 bg-[#FFE600] text-black text-[10px] font-mono-numbers font-bold px-1.5 py-0.5 border-2 border-black rotate-12">
                ⚡ 100% LOUD
              </div>
            </div>
            
            <span className="hidden md:inline-block font-handwriting text-xl text-[#8B2BFF] dark:text-[#B6FF00] font-bold">
              Shared expenses, zero chill.
            </span>
          </div>

          {/* User Profile Perspective & Controls */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* View As (Perspective Switcher) */}
            <div className="flex items-center bg-[#F3F4F6] dark:bg-[#1A1C28] border-2 border-black dark:border-white px-2 py-1 rounded-md brutal-shadow-sm">
              <span className="text-[11px] font-mono-numbers font-bold mr-1.5 text-gray-600 dark:text-gray-300">
                YOU:
              </span>
              <select
                aria-label="Select Current User Perspective"
                value={currentUserId}
                onChange={(e) => {
                  sounds.playPop();
                  onSelectUser(e.target.value);
                }}
                className="bg-transparent font-bold text-xs sm:text-sm font-body cursor-pointer focus:outline-none dark:text-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="text-black">
                    {m.emoji} {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity Log Button */}
            <button
              onClick={() => {
                sounds.playPop();
                onOpenActivity();
              }}
              title="Open Activity Feed"
              className="bg-[#00F0FF] hover:bg-[#3bf4ff] text-black p-2 border-2 border-black brutal-btn brutal-shadow-sm rounded flex items-center gap-1 text-xs font-bold font-mono-numbers"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">LOG</span>
            </button>

            {/* Sound FX Toggle */}
            <button
              onClick={() => {
                onToggleMute();
                if (isMuted) sounds.playPop();
              }}
              title={isMuted ? 'Unmute 8-bit sound effects' : 'Mute sound effects'}
              className="bg-[#FFE600] text-black p-2 border-2 border-black brutal-btn brutal-shadow-sm rounded"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                sounds.playPop();
                onToggleDark();
              }}
              title={isDark ? 'Switch to Cream Pop Mode' : 'Switch to Neon Dark Mode'}
              className="bg-[#B6FF00] text-black p-2 border-2 border-black brutal-btn brutal-shadow-sm rounded"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Reset Demo Data Button */}
            <button
              onClick={() => {
                if (window.confirm('Reset all demo data back to default?')) {
                  sounds.playSuccess();
                  onResetDemoData();
                }
              }}
              title="Reset Demo Data"
              className="bg-[#FF7A00] text-black p-2 border-2 border-black brutal-btn brutal-shadow-sm rounded"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Groups Navigation Strip */}
        <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-heading uppercase text-gray-500 dark:text-gray-400 mr-1 hidden sm:inline">
              Groups:
            </span>
            {groups.map((grp) => {
              const isSelected = grp.id === activeGroupId;
              return (
                <button
                  key={grp.id}
                  onClick={() => {
                    sounds.playPop();
                    onSelectGroup(grp.id);
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-bold border-2 border-black brutal-btn whitespace-nowrap rounded transition-all ${
                    isSelected
                      ? 'bg-[#FF2E93] text-white brutal-shadow -rotate-1 font-heading'
                      : 'bg-white dark:bg-[#1f2028] dark:text-white hover:bg-[#FFE600] hover:text-black hover:rotate-1'
                  }`}
                  style={{
                    backgroundColor: isSelected ? grp.signatureColor || '#FF2E93' : undefined,
                    color: isSelected ? '#000000' : undefined,
                  }}
                >
                  <span className="mr-1.5">{grp.emoji}</span>
                  {grp.name}
                  <span className="ml-2 text-[10px] px-1.5 py-0.2 bg-black text-white rounded-full">
                    {grp.expenses?.length || 0}
                  </span>
                </button>
              );
            })}

            {/* Add Group Button */}
            <button
              onClick={() => {
                sounds.playPop();
                onOpenCreateGroup();
              }}
              className="px-2.5 py-1.5 text-xs font-bold border-2 border-dashed border-black dark:border-white bg-[#B6FF00] text-black brutal-btn rounded flex items-center gap-1 hover:bg-[#cbff3a]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW GROUP</span>
            </button>
          </div>

          {/* Group Settings / Edit */}
          {activeGroup && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sounds.playPop();
                  onOpenEditGroup(activeGroup);
                }}
                className="text-xs font-mono-numbers font-bold underline hover:text-[#FF2E93] dark:text-gray-300 dark:hover:text-[#FFE600] flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Edit Members ({activeGroup.memberIds?.length || 0})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
