import React, { useState } from 'react';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '../utils/constants';
import { X, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  api,
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⚡');
  const [selectedColor, setSelectedColor] = useState('#FF2E93');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ username, password });
        sounds.playSuccess();
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await api.register({
          username,
          password,
          display_name: displayName || username,
          emoji: selectedEmoji,
          color: selectedColor,
        });
        sounds.playSuccess();
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err) {
      sounds.playBuzzer();
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-[#161722] border-4 border-black dark:border-[#FFE600] rounded-xl brutal-shadow-xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Washi tape topper */}
        <div className="washi-tape-top"></div>

        {/* Modal Header */}
        <div className="bg-[#FFE600] text-black border-b-3 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg sm:text-xl">
              {mode === 'login' ? '⚡ LOG IN TO SPLIT//MAX' : '⚡ CREATE ACCOUNT'}
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

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 border-b-2 border-black bg-gray-100 dark:bg-[#1A1C28]">
          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              setMode('login');
              setError('');
            }}
            className={`py-2.5 font-heading text-xs tracking-wider border-r border-black uppercase flex items-center justify-center gap-1.5 min-h-[40px] ${
              mode === 'login'
                ? 'bg-[#B6FF00] text-black font-extrabold'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              setMode('register');
              setError('');
            }}
            className={`py-2.5 font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 min-h-[40px] ${
              mode === 'register'
                ? 'bg-[#FF2E93] text-white font-extrabold'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register</span>
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

          {/* Username */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
              Username *
            </label>
            <input
              type="text"
              placeholder="e.g. alex_cool"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-sm font-bold font-mono-numbers text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
              Password *
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-sm font-bold font-mono-numbers text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF2E93]"
            />
          </div>

          {/* Registration Extra Fields */}
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-heading uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#202230] border-2 border-black rounded text-sm font-bold font-body text-black dark:text-white focus:outline-none"
                />
              </div>

              {/* Avatar Emoji & Color Picker */}
              <div className="p-3 bg-gray-50 dark:bg-[#1E1F2A] border-2 border-black rounded-lg space-y-2">
                <span className="text-xs font-heading uppercase text-black dark:text-white block">
                  Customize Avatar
                </span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {AVATAR_EMOJIS.map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => {
                        sounds.playPop();
                        setSelectedEmoji(em);
                      }}
                      className={`w-8 h-8 text-base border-2 border-black rounded flex items-center justify-center transition-all ${
                        selectedEmoji === em ? 'bg-[#FFE600] scale-110 brutal-shadow-sm' : 'bg-white dark:bg-[#252838]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      type="button"
                      key={col}
                      onClick={() => {
                        sounds.playPop();
                        setSelectedColor(col);
                      }}
                      className={`w-7 h-7 rounded-full border-2 border-black transition-transform ${
                        selectedColor === col ? 'scale-125 brutal-shadow-sm ring-2 ring-black' : ''
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 font-heading text-xs border-3 border-black rounded uppercase brutal-shadow brutal-btn flex items-center justify-center gap-2 min-h-[40px] ${
                mode === 'login' ? 'bg-[#FFE600] text-black hover:bg-[#fff04d]' : 'bg-[#B6FF00] text-black hover:bg-[#cbff3a]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'PROCESSING...' : mode === 'login' ? 'SIGN IN ⚡' : 'CREATE ACCOUNT 🎉'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
