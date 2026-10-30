import React from 'react';
import {
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Users,
  Plus,
  Sparkles,
  History,
  LogOut,
  LogIn,
  Key,
  UploadCloud,
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function Header({
  groups = [],
  activeGroupId,
  onSelectGroup,
  onOpenCreateGroup,
  onOpenEditGroup,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenJoinGroup,
  isDark,
  onToggleDark,
  isMuted,
  onToggleMute,
  onOpenActivity,
  onLoadDemoGroup,
  onImportLocalData,
  hasLocalData = false,
}) {
  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  return (
    <header className="border-b-4 border-black bg-white dark:bg-[#0D0E15] dark:border-[#FFE600] transition-colors relative z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        {/* Top Brand & Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Tag */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => sounds.playSuccess()}>
              <div className="bg-[#FF2E93] text-black font-display text-xl sm:text-2xl px-3 py-1.5 border-3 border-black brutal-shadow-sm -rotate-2 transform group-hover:rotate-0 transition-transform min-h-[40px] flex items-center">
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

          {/* User Profile & Action Controls */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            
            {/* User Account / Auth Button */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-[#F3F4F6] dark:bg-[#1A1C28] border-2 border-black dark:border-white px-2.5 py-1 rounded-md brutal-shadow-sm min-h-[40px]">
                <div
                  className="w-6 h-6 rounded-full border border-black flex items-center justify-center text-xs"
                  style={{ backgroundColor: currentUser.color || '#FF2E93' }}
                >
                  {currentUser.emoji || '⚡'}
                </div>
                <span className="text-xs font-heading text-black dark:text-white truncate max-w-[110px]">
                  {currentUser.display_name || currentUser.username}
                </span>

                <button
                  onClick={() => {
                    sounds.playPop();
                    onLogout();
                  }}
                  title="Sign Out"
                  className="p-1 text-gray-500 hover:text-[#FF2E93] dark:text-gray-300 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  sounds.playPop();
                  onOpenAuth();
                }}
                className="bg-[#FFE600] hover:bg-[#fff04d] text-black px-3 py-1.5 border-2 border-black brutal-btn brutal-shadow-sm rounded font-heading text-xs uppercase flex items-center gap-1.5 min-h-[40px]"
              >
                <LogIn className="w-4 h-4" />
                <span>SIGN IN</span>
              </button>
            )}

            {/* Join Group with Code */}
            <button
              onClick={() => {
                sounds.playPop();
                onOpenJoinGroup();
              }}
              title="Join a group with invite code"
              className="bg-[#00F0FF] hover:bg-[#3bf4ff] text-black px-2.5 py-1.5 border-2 border-black brutal-btn brutal-shadow-sm rounded flex items-center gap-1 text-xs font-bold font-mono-numbers min-h-[40px] min-w-[40px]"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">JOIN</span>
            </button>

            {/* Import Local Storage Data if exists */}
            {hasLocalData && (
              <button
                onClick={() => {
                  sounds.playSuccess();
                  onImportLocalData();
                }}
                title="Import your local browser data to your cloud account"
                className="bg-[#FF7A00] hover:bg-[#ff8e24] text-black px-2.5 py-1.5 border-2 border-black brutal-btn brutal-shadow-sm rounded flex items-center gap-1 text-xs font-bold font-mono-numbers min-h-[40px] min-w-[40px]"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">IMPORT</span>
              </button>
            )}

            {/* Load Demo Group Button */}
            <button
              onClick={() => {
                if (window.confirm('Load standard demo group into your account?')) {
                  sounds.playSuccess();
                  onLoadDemoGroup();
                }
              }}
              title="Load demo group with sample expenses"
              className="bg-[#B6FF00] hover:bg-[#c9ff40] text-black px-2.5 py-1.5 border-2 border-black brutal-btn brutal-shadow-sm rounded flex items-center gap-1 text-xs font-bold font-mono-numbers min-h-[40px] min-w-[40px]"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">DEMO</span>
            </button>

            {/* Activity Log Button */}
            <button
              onClick={() => {
                sounds.playPop();
                onOpenActivity();
              }}
              title="Open Activity Feed"
              className="bg-white dark:bg-[#1E1F2A] hover:bg-gray-100 text-black dark:text-white px-2.5 py-1.5 border-2 border-black brutal-btn brutal-shadow-sm rounded flex items-center gap-1 text-xs font-bold font-mono-numbers min-h-[40px] min-w-[40px]"
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
              className="bg-[#FFE600] text-black p-2 border-2 border-black brutal-btn brutal-shadow-sm rounded min-h-[40px] min-w-[40px] flex items-center justify-center"
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
              className="bg-[#B6FF00] text-black p-2 border-2 border-black brutal-btn brutal-shadow-sm rounded min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

          </div>
        </div>

        {/* Groups Navigation Strip (Wrapping & Scroll-Safe) */}
        <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap pb-1 max-w-full">
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
                  className={`px-3 py-2 text-xs sm:text-sm font-bold border-2 border-black brutal-btn whitespace-nowrap rounded transition-all min-h-[40px] flex items-center ${
                    isSelected
                      ? 'bg-[#FF2E93] text-white brutal-shadow -rotate-1 font-heading'
                      : 'bg-white dark:bg-[#1f2028] dark:text-white hover:bg-[#FFE600] hover:text-black hover:rotate-1'
                  }`}
                  style={{
                    backgroundColor: isSelected ? grp.signatureColor || grp.signature_color || '#FF2E93' : undefined,
                    color: isSelected ? '#000000' : undefined,
                  }}
                >
                  <span className="mr-1.5">{grp.emoji}</span>
                  {grp.name}
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-black text-white rounded-full">
                    {grp.expenses?.length ?? grp.expense_count ?? 0}
                  </span>
                </button>
              );
            })}

            {/* Add Group Button - Never Hidden, Min 40x40px */}
            <button
              onClick={() => {
                sounds.playPop();
                onOpenCreateGroup();
              }}
              className="px-3 py-2 text-xs font-bold border-2 border-dashed border-black dark:border-white bg-[#B6FF00] text-black brutal-btn rounded flex items-center gap-1.5 hover:bg-[#cbff3a] min-h-[40px]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>NEW GROUP</span>
            </button>
          </div>

          {/* Group Settings / Edit Members */}
          {activeGroup && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sounds.playPop();
                  onOpenEditGroup(activeGroup);
                }}
                className="text-xs font-mono-numbers font-bold underline hover:text-[#FF2E93] dark:text-gray-300 dark:hover:text-[#FFE600] flex items-center gap-1.5 min-h-[40px] px-2"
              >
                <Users className="w-4 h-4" />
                <span>Edit Members ({activeGroup.members?.length || activeGroup.memberIds?.length || 0})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
