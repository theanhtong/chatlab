import React, { useState, useRef } from 'react';
import { IconX, IconCamera, IconLoader2 } from '@tabler/icons-react';

interface ProfileModalProps {
  user: any;
  token: string;
  onClose: () => void;
  onProfileUpdated: (updatedUser: any) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  token,
  onClose,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [bio, setBio] = useState(user.bio || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Chỉ cho phép tải lên file hình ảnh');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3000/uploads/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Tải ảnh đại diện thất bại');

      setAvatar(data.url);
    } catch (err: any) {
      setError(err.message || 'Tải ảnh đại diện thất bại');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, avatar, bio }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Cập nhật tài khoản thất bại');
      }

      localStorage.setItem('user', JSON.stringify(data));
      onProfileUpdated(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col text-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-200">Cài đặt tài khoản</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 cursor-pointer">
            <IconX size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="p-4 space-y-5">
          {/* Avatar Upload Container */}
          <div className="flex flex-col items-center justify-center py-2">
            <div 
              onClick={handleAvatarClick}
              className="w-24 h-24 rounded-full bg-slate-850 border-2 border-slate-700/50 overflow-hidden relative group cursor-pointer hover:border-blue-500 transition-all flex items-center justify-center"
            >
              {avatar ? (
                <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <span className="text-2xl font-bold text-slate-400">
                  {displayName ? displayName.slice(0, 2).toUpperCase() : 'ME'}
                </span>
              )}

              {/* Upload Hover Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-200">
                <IconCamera size={20} className="text-white" />
                <span className="text-[10px] text-white font-medium mt-1">Tải ảnh lên</span>
              </div>

              {/* Uploading Spinner */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10">
                  <IconLoader2 size={24} className="text-blue-400 animate-spin" />
                </div>
              )}
            </div>
            
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={uploadingAvatar}
            />
            <p className="text-[10px] text-slate-500 mt-2">Click để chọn ảnh từ máy tính (tối đa 5MB)</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Tên hiển thị</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Tiểu sử</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="Giới thiệu về bản thân bạn..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || uploadingAvatar}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 font-medium text-white rounded-xl text-sm transition-colors cursor-pointer"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
