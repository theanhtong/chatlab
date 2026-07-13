import React, { useState } from 'react';
import { IconX, IconSearch } from '@tabler/icons-react';

interface ShareModalProps {
  conversations: any[];
  onClose: () => void;
  onShareConfirm: (targetIds: string[]) => void;
  messagePreview: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  conversations,
  onClose,
  onShareConfirm,
  messagePreview,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filtered = conversations.filter(c => {
    const name = c.name || 'Chat';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleShare = () => {
    if (selectedIds.length > 0) {
      onShareConfirm(selectedIds);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[500px] text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-200">Chuyển tiếp tin nhắn</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 cursor-pointer">
            <IconX size={20} />
          </button>
        </div>

        {/* Message preview */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 text-xs text-slate-400 font-mono truncate">
          Nội dung: "{messagePreview}"
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800/60 relative">
          <IconSearch size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">Không tìm thấy cuộc trò chuyện nào</p>
          ) : (
            filtered.map(c => {
              const isSelected = selectedIds.includes(c._id);
              return (
                <div
                  key={c._id}
                  onClick={() => toggleSelect(c._id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-blue-600/10 border border-blue-500/20' : 'border border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-350 flex items-center justify-center font-bold text-sm">
                      {c.name ? c.name.slice(0, 2).toUpperCase() : 'CH'}
                    </div>
                    <span className="text-sm font-medium text-slate-200">{c.name || 'Trò chuyện'}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950 cursor-pointer"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium rounded-xl text-sm transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleShare}
            disabled={selectedIds.length === 0}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-slate-400 font-medium text-white rounded-xl text-sm transition-colors cursor-pointer"
          >
            Gửi ({selectedIds.length})
          </button>
        </div>

      </div>
    </div>
  );
};
