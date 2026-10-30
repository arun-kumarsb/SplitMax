import React from 'react';
import { formatCurrency } from '../utils/expenseLogic';
import {
  X,
  RotateCcw,
  History,
  PlusCircle,
  Edit,
  Trash,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function ActivityFeedModal({
  isOpen,
  onClose,
  activities = [],
  onUndoLastAction,
  canUndo = false,
  groupCurrency = 'INR',
}) {
  if (!isOpen) return null;

  // Strict newest-first sorting by timestamp/created_at
  const sortedActivities = [...activities].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
    const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#161722] border-4 border-black dark:border-[#00F0FF] rounded-xl brutal-shadow-xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Washi tape topper */}
        <div className="washi-tape-top"></div>

        {/* Modal Header */}
        <div className="bg-[#00F0FF] text-black border-b-3 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-black" />
            <span className="font-display text-lg sm:text-xl">
              ACTIVITY FEED // AUDIT LOG
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

        {/* Undo bar if available */}
        <div className="p-3 bg-yellow-100 dark:bg-[#202230] border-b-2 border-black flex items-center justify-between">
          <span className="text-xs font-mono-numbers font-bold text-black dark:text-gray-300">
            Mistake happened? Undo the latest action:
          </span>

          <button
            onClick={() => {
              sounds.playSuccess();
              onUndoLastAction();
            }}
            disabled={!canUndo}
            className={`px-3 py-1.5 font-heading text-xs border-2 border-black rounded brutal-btn flex items-center gap-1.5 min-h-[40px] ${
              canUndo
                ? 'bg-[#FF2E93] text-white hover:bg-[#ff1587] brutal-shadow-sm'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>UNDO LAST</span>
          </button>
        </div>

        {/* Feed List */}
        <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto space-y-3">
          {sortedActivities.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-mono-numbers">
              No recent activity recorded.
            </div>
          ) : (
            sortedActivities.map((act, idx) => {
              const isSettlement = act.type === 'settlement';
              const isDelete = act.type === 'expense_delete';
              const isEdit = act.type === 'expense_edit';

              // Bug 6 Fix: Make the "expense added" icon black (not lime on lime)
              let icon = <PlusCircle className="w-4 h-4 text-black" />;
              let badgeColor = 'bg-[#B6FF00]';

              if (isSettlement) {
                icon = <CheckCircle className="w-4 h-4 text-black" />;
                badgeColor = 'bg-[#FFE600]';
              } else if (isDelete) {
                icon = <Trash className="w-4 h-4 text-white" />;
                badgeColor = 'bg-[#FF2E93]';
              } else if (isEdit) {
                icon = <Edit className="w-4 h-4 text-black" />;
                badgeColor = 'bg-[#00F0FF]';
              }

              const ts = act.timestamp || act.created_at || Date.now();
              const formattedTime = new Date(ts).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const formattedDate = new Date(ts).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={act.id || idx}
                  className="p-3 bg-gray-50 dark:bg-[#1E1F2A] border-2 border-black rounded flex items-start gap-3 hover:bg-yellow-50 dark:hover:bg-[#252838] transition-colors"
                >
                  <div className={`p-1.5 border border-black rounded ${badgeColor} shrink-0`}>
                    {icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-heading text-black dark:text-white">
                        {act.groupName || act.group_name || 'Group'}
                      </span>
                      <span className="text-[10px] font-mono-numbers text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formattedDate} {formattedTime}
                      </span>
                    </div>

                    <p className="text-xs font-body font-bold text-gray-800 dark:text-gray-200 mt-1">
                      {act.description}
                    </p>

                    {(act.amount || act.payload?.amount_paise) && (
                      <span className="inline-block mt-1 text-[11px] font-mono-numbers font-extrabold text-[#FF2E93]">
                        {formatCurrency(
                          act.amount ?? (Number(act.payload?.amount_paise) / 100),
                          groupCurrency
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Close Button */}
        <div className="p-3 bg-gray-100 dark:bg-[#12131C] border-t-2 border-black text-right">
          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-heading text-xs border border-black rounded brutal-btn min-h-[40px]"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
}
