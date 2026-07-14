import React, { useState, useRef } from 'react';
import { API_URL } from '../config';
import { IconX, IconCamera, IconLoader2, IconPencil, IconCalendar, IconPhone, IconUser, IconNotebook } from '@tabler/icons-react';

interface ProfileModalProps {
  user: any;
  token: string;
  onClose: () => void;
  onProfileUpdated: (updatedUser: any) => void;
  lang: 'vi' | 'en';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  token,
  onClose,
  onProfileUpdated,
  lang,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [coverImage, setCoverImage] = useState(user.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80');
  const [bio, setBio] = useState(user.bio || '');
  const [gender, setGender] = useState(user.gender || 'Nam');
  const [birthDate, setBirthDate] = useState(user.birthDate || '09/04/2005');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleCoverClick = () => {
    coverInputRef.current?.click();
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
      const res = await fetch(`${API_URL}/uploads/image`, {
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

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Chỉ cho phép tải lên file hình ảnh');
      return;
    }

    setUploadingCover(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/uploads/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Tải ảnh bìa thất bại');

      setCoverImage(data.url);
    } catch (err: any) {
      setError(err.message || 'Tải ảnh bìa thất bại');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, avatar, coverImage, bio, gender, birthDate }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Cập nhật tài khoản thất bại');
      }

      localStorage.setItem('user', JSON.stringify(data));
      onProfileUpdated(data);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-[440px] rounded-2xl shadow-2xl flex flex-col text-slate-100 animate-in zoom-in-95 duration-150 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <h3 className="text-[15px] font-bold text-slate-200">Thông tin tài khoản</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 cursor-pointer transition-colors">
            <IconX size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto max-h-[520px]">
          {/* Cover & Avatar Header */}
          <div className="relative h-[210px] w-full shrink-0">
            {/* Cover Image */}
            <div 
              onClick={handleCoverClick}
              className="absolute inset-0 h-[155px] w-full bg-slate-850 cursor-pointer overflow-hidden group border-b border-slate-800"
            >
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <IconCamera size={20} className="text-white mr-2" />
                <span className="text-xs text-white">Đổi ảnh bìa</span>
              </div>
              {uploadingCover && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <IconLoader2 size={24} className="text-blue-400 animate-spin" />
                </div>
              )}
            </div>
            <input 
              type="file"
              ref={coverInputRef}
              onChange={handleCoverChange}
              accept="image/*"
              className="hidden"
              disabled={uploadingCover}
            />

            {/* Avatar overlapping */}
            <div className="absolute bottom-1 left-6 z-10">
              <div 
                onClick={handleAvatarClick}
                className="w-[84px] h-[84px] rounded-full bg-slate-900 border-2 border-slate-900 overflow-hidden relative group cursor-pointer shadow-lg hover:border-blue-500 transition-colors flex items-center justify-center"
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-slate-300">
                    {displayName ? displayName.slice(0, 2).toUpperCase() : 'ME'}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <IconCamera size={16} className="text-white" />
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <IconLoader2 size={18} className="text-blue-400 animate-spin" />
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
            </div>

            {/* Display Name beside Avatar */}
            <div className="absolute bottom-4 left-[125px] flex items-center gap-1.5 pr-4">
              <span className="text-base font-bold text-slate-100 truncate">{displayName}</span>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="p-1 hover:bg-slate-800/80 rounded text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <IconPencil size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="h-4" />

          {/* Details Form / View */}
          <div className="p-5">
            {!isEditing ? (
              /* VIEW MODE */
              <div className="space-y-5">
                <h4 className="text-sm font-bold text-slate-200 tracking-wide">{lang === 'vi' ? 'Thông tin cá nhân' : 'Profile Information'}</h4>
                
                <div className="space-y-3.5 text-[13px]">
                  <div className="flex items-center text-slate-350">
                    <div className="w-[100px] text-slate-405 flex items-center gap-2 text-slate-400">
                      <IconUser size={15} />
                      <span>{lang === 'vi' ? 'Giới tính' : 'Gender'}</span>
                    </div>
                    <span className="text-slate-200 font-medium">
                      {gender === 'Nam' ? (lang === 'vi' ? 'Nam' : 'Male') : gender === 'Nữ' ? (lang === 'vi' ? 'Nữ' : 'Female') : (lang === 'vi' ? 'Khác' : 'Other')}
                    </span>
                  </div>

                  <div className="flex items-center text-slate-350">
                    <div className="w-[100px] text-slate-405 flex items-center gap-2 text-slate-400">
                      <IconCalendar size={15} />
                      <span>{lang === 'vi' ? 'Ngày sinh' : 'Date of birth'}</span>
                    </div>
                    <span className="text-slate-200 font-medium">{birthDate}</span>
                  </div>

                  <div className="flex items-center text-slate-350">
                    <div className="w-[100px] text-slate-405 flex items-center gap-2 text-slate-400">
                      <IconPhone size={15} />
                      <span>{lang === 'vi' ? 'Điện thoại' : 'Phone'}</span>
                    </div>
                    <span className="text-slate-200 font-medium">{user.phone || (lang === 'vi' ? 'Không công khai' : 'Private')}</span>
                  </div>

                  <div className="flex items-start text-slate-350">
                    <div className="w-[100px] text-slate-405 flex items-center gap-2 text-slate-400 shrink-0">
                      <IconNotebook size={15} />
                      <span>{lang === 'vi' ? 'Tiểu sử' : 'Bio'}</span>
                    </div>
                    <span className="text-slate-200 break-words flex-1 font-medium">{bio || (lang === 'vi' ? 'Chưa cập nhật tiểu sử.' : 'No bio updated.')}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic mt-4 select-none">
                  {lang === 'vi' ? 'Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này' : 'Only friends with your number in their contacts can see this'}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-blue-400 font-bold rounded-xl text-[13px] transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-750"
                  >
                    <IconPencil size={15} />
                    <span>{lang === 'vi' ? 'Cập nhật' : 'Update Info'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <form onSubmit={handleUpdate} className="space-y-4">
                <h4 className="text-sm font-bold text-slate-200 tracking-wide mb-3">{lang === 'vi' ? 'Chỉnh sửa thông tin' : 'Edit Information'}</h4>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'vi' ? 'Tên hiển thị' : 'Display Name'}</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'vi' ? 'Giới tính' : 'Gender'}</label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="Nam">{lang === 'vi' ? 'Nam' : 'Male'}</option>
                        <option value="Nữ">{lang === 'vi' ? 'Nữ' : 'Female'}</option>
                        <option value="Khác">{lang === 'vi' ? 'Khác' : 'Other'}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'vi' ? 'Ngày sinh' : 'Date of birth'}</label>
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={birthDate}
                        onChange={e => setBirthDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'vi' ? 'Tiểu sử' : 'Biography'}</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      rows={2}
                      placeholder={lang === 'vi' ? 'Viết vài câu tự giới thiệu...' : 'Write a short bio...'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      // reset values to current user values
                      setDisplayName(user.displayName || '');
                      setAvatar(user.avatar || '');
                      setCoverImage(user.coverImage || '');
                      setBio(user.bio || '');
                      setGender(user.gender || 'Nam');
                      setBirthDate(user.birthDate || '09/04/2005');
                    }}
                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploadingAvatar || uploadingCover}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 font-bold text-white rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {loading ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu thay đổi' : 'Save changes')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
