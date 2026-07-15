import React, { useEffect, useRef } from 'react';
import { IconArrowBackUp, IconShare, IconPin, IconTrash } from '@tabler/icons-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  message: any;
  currentUserId: string;
  onReply: () => void;
  onShare: () => void;
  onRevoke: () => void;
  onTogglePin: () => void;
  isFriend: boolean;
  isBlocked?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  message,
  currentUserId,
  onReply,
  onShare,
  onRevoke,
  onTogglePin,
  isFriend,
  isBlocked = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwnMessage = message.senderId?._id === currentUserId || message.senderId === currentUserId;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{ top: y, left: x }}
      className="absolute z-50 bg-slate-900 border border-slate-800 text-slate-200 py-1.5 rounded-xl shadow-xl w-48 text-sm"
    >
      {!isBlocked && (
        <>
          <button
            onClick={() => {
              onReply();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <IconArrowBackUp size={16} className="text-slate-400" />
            <span>Trả lời</span>
          </button>

          <button
            onClick={() => {
              onShare();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <IconShare size={16} className="text-slate-400" />
            <span>Chia sẻ / Chuyển tiếp</span>
          </button>

          {isFriend && (
            <button
              onClick={() => {
                onTogglePin();
                onClose();
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <IconPin size={16} className="text-slate-400" />
              <span>{message.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}</span>
            </button>
          )}
        </>
      )}

      {isOwnMessage && !message.isRevoked && (
        <button
          onClick={() => {
            onRevoke();
            onClose();
          }}
          className={`w-full text-left px-4 py-2 hover:bg-slate-800 text-rose-400 hover:text-rose-300 flex items-center gap-2 cursor-pointer transition-colors ${
            isBlocked ? '' : 'border-t border-slate-800/80 mt-1'
          }`}
        >
          <IconTrash size={16} />
          <span>Thu hồi tin nhắn</span>
        </button>
      )}
    </div>
  );
};
