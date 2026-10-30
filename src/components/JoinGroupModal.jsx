import React, { useState } from 'react';
import { X, UserCheck, Key, ArrowRight } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function JoinGroupModal({
  isOpen,
  onClose,
  onJoinSuccess,
  api,
}) {
  if (!isOpen) return null;

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setError('');
    setLoading(true);

    try {
      const res = await api.joinGroup(inviteCode.trim());
      sounds.playSuccess();
      onJoinSuccess(res.group);
      onClose();
    } catch (err) {
      sounds.playBuzzer();
      setError(err.message || 'Invalid or expired invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-[#161722] border-4 border-black dark:border-[#00F0FF] rounded-xl brutal-shadow-xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Washi tape topper */}
        <div className="washi-tape-top"></div>

        {/* Header */}
        <div className="bg-[#00F0FF] text-black border-b-3 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-black" />
            <span className="font-display text-lg sm:text-xl">
              JOIN WITH INVITE CODE
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          
          {error && (
            <div className="p-2.5 bg-[#FF2E93] text-white border-2 border-black rounded text-xs font-mono-numbers font-bold flex items-center gap-2 animate-shake">
              <span>🚨</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
              Enter 8-Character Invite Code *
            </label>
            <input
              type="text"
              maxLength={20}
              placeholder="e.g. 7A8B9C1D"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-center tracking-widest text-lg font-mono-numbers font-extrabold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
            />
            <p className="text-[11px] font-handwriting text-gray-500 mt-1.5">
              Ask any group member to share their group's invite code!
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#00F0FF] hover:bg-[#3cebff] text-black font-heading text-xs border-3 border-black rounded uppercase brutal-shadow brutal-btn flex items-center justify-center gap-2 min-h-[40px]"
            >
              <UserCheck className="w-4 h-4" />
              <span>{loading ? 'JOINING...' : 'JOIN GROUP NOW ⚡'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
