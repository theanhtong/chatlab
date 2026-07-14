import React, { useState, useEffect } from 'react';
import {
  IconUsers, IconShield, IconBan, IconArrowLeftRight, IconChartBar
} from '@tabler/icons-react';

interface AdminDashboardProps {
  token: string;
  onClose: () => void;
  lang: 'vi' | 'en';
  theme: 'light' | 'dark';
  currentUser: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onClose, lang, theme, currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search and filter states
  const [userFilter, setUserFilter] = useState<'all' | 'admin' | 'user' | 'banned'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const t = {
    title: lang === 'vi' ? 'Quản Trị Hệ Thống' : 'System Administration',
    overview: lang === 'vi' ? 'Tổng quan' : 'Overview',
    users: lang === 'vi' ? 'Thành viên' : 'Users List',
    totalUsers: lang === 'vi' ? 'Tổng thành viên' : 'Total Users',
    onlineUsers: lang === 'vi' ? 'Đang hoạt động' : 'Online Users',
    bannedUsers: lang === 'vi' ? 'Tài khoản bị khóa' : 'Banned Accounts',
    totalMessages: lang === 'vi' ? 'Tổng tin nhắn' : 'Total Messages',
    totalConvos: lang === 'vi' ? 'Tổng cuộc trò chuyện' : 'Total Conversations',
    directConvos: lang === 'vi' ? 'Chat cá nhân' : 'Direct Chats',
    groupConvos: lang === 'vi' ? 'Chat nhóm' : 'Group Chats',
    username: lang === 'vi' ? 'Tên đăng nhập' : 'Username',
    displayName: lang === 'vi' ? 'Tên hiển thị' : 'Display Name',
    phone: lang === 'vi' ? 'Số điện thoại' : 'Phone',
    role: lang === 'vi' ? 'Vai trò' : 'Role',
    status: lang === 'vi' ? 'Trạng thái' : 'Status',
    actions: lang === 'vi' ? 'Hành động' : 'Actions',
    active: lang === 'vi' ? 'Hoạt động' : 'Active',
    banned: lang === 'vi' ? 'Bị khóa' : 'Banned',
    makeAdmin: lang === 'vi' ? 'Cấp quyền Admin' : 'Make Admin',
    removeAdmin: lang === 'vi' ? 'Thu hồi Admin' : 'Revoke Admin',
    banUser: lang === 'vi' ? 'Khóa tài khoản' : 'Ban User',
    unbanUser: lang === 'vi' ? 'Mở khóa' : 'Unban User',
  };

  useEffect(() => {
    if (activeSubTab === 'overview') {
      fetchStats();
    } else {
      fetchUsers();
    }
  }, [activeSubTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`http://localhost:3000/admin/stats?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:3000/admin/users?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError(lang === 'vi' ? 'Không thể tải danh sách thành viên' : 'Failed to load users list');
      }
    } catch (err) {
      setError(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (userId: string) => {
    const targetUser = users.find(u => u._id === userId);
    if (!targetUser) return;
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';

    // Optimistic UI state update: toggle role immediately on UI
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));

    try {
      const res = await fetch(`http://localhost:3000/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        // Rollback state on error
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: targetUser.role } : u));
        const data = await res.json();
        setError(data.message || 'Lỗi thay đổi quyền hạn');
      } else {
        fetchUsers();
      }
    } catch (err) {
      // Rollback state on connection failure
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: targetUser.role } : u));
      setError('Lỗi kết nối máy chủ');
    }
  };

  const handleToggleBan = async (userId: string) => {
    const targetUser = users.find(u => u._id === userId);
    if (!targetUser) return;
    const isBanned = !targetUser.isBanned;

    // Optimistic UI state update: toggle ban status immediately on UI
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: isBanned } : u));

    try {
      const endpoint = isBanned ? 'ban' : 'unban';
      const res = await fetch(`http://localhost:3000/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        // Rollback state on error
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: targetUser.isBanned } : u));
        const data = await res.json();
        setError(data.message || 'Lỗi xử lý tài khoản');
      } else {
        fetchUsers();
      }
    } catch (err) {
      // Rollback state on connection failure
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: targetUser.isBanned } : u));
      setError('Lỗi kết nối máy chủ');
    }
  };

  // Filter and Search logic
  const filteredUsers = users.filter(u => {
    if (userFilter === 'admin' && u.role !== 'admin') return false;
    if (userFilter === 'user' && u.role !== 'user') return false;
    if (userFilter === 'banned' && !u.isBanned) return false;

    if (userSearchQuery.trim() !== '') {
      const query = userSearchQuery.toLowerCase();
      const matchesName = (u.displayName || '').toLowerCase().includes(query);
      const matchesUsername = (u.username || '').toLowerCase().includes(query);
      const matchesPhone = (u.phone || '').toLowerCase().includes(query);
      return matchesName || matchesUsername || matchesPhone;
    }
    return true;
  });

  return (
    <div className={`w-screen h-screen flex select-none font-sans overflow-hidden transition-colors duration-200 ${theme === 'light' ? 'bg-white text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}>

      {/* Admin Left Sidebar */}
      <div className={`w-64 flex flex-col justify-between p-6 shrink-0 border-r ${theme === 'light' ? 'bg-[#fbfbfa] border-slate-200' : 'bg-[#0f172a] border-slate-800'
        }`}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 px-1 py-1">
            <IconShield className="text-blue-500" size={20} />
            <div>
              <h2 className={`text-xs font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-850' : 'text-slate-100'}`}>{t.title}</h2>
              <span className={`text-[8.5px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>Admin Center</span>
            </div>
          </div>

          {/* Navigation Options */}
          <div className="space-y-0.5">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2.5 ${activeSubTab === 'overview'
                ? (theme === 'light' ? 'bg-slate-200/60 text-slate-900 border border-slate-300/40' : 'bg-slate-800 text-white')
                : (theme === 'light' ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200')
                }`}
            >
              <IconChartBar size={15} />
              <span>{t.overview}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('users')}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2.5 ${activeSubTab === 'users'
                ? (theme === 'light' ? 'bg-slate-200/60 text-slate-900 border border-slate-300/40' : 'bg-slate-800 text-white')
                : (theme === 'light' ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200')
                }`}
            >
              <IconUsers size={15} />
              <span>{t.users}</span>
            </button>
          </div>
        </div>

        {/* Back to Chat Option at Bottom */}
        <button
          onClick={onClose}
          className="w-full px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
        >
          <IconArrowLeftRight size={15} />
          <span>{lang === 'vi' ? 'Quay lại Chat' : 'Back to Chat'}</span>
        </button>
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 h-screen overflow-y-auto p-12">
        {activeSubTab === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-100">
            {stats ? (
              <>
                {/* Stats Cards in Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Total Users Card */}
                  <div className={`p-6 border rounded-2xl flex flex-col justify-between h-28 transition-all ${theme === 'light'
                    ? 'bg-slate-50/50 border-slate-200/80 text-slate-800 shadow-xs'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-100'
                    }`}>
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>{t.totalUsers}</span>
                    <h4 className="text-3xl font-extrabold">{stats.totalUsers}</h4>
                  </div>

                  {/* Online Users Card */}
                  <div className={`p-6 border rounded-2xl flex flex-col justify-between h-28 transition-all ${theme === 'light'
                    ? 'bg-slate-50/50 border-slate-200/80 text-slate-800 shadow-xs'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-100'
                    }`}>
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>{t.onlineUsers}</span>
                    <h4 className="text-3xl font-extrabold text-emerald-500">{stats.onlineUsers}</h4>
                  </div>

                  {/* Banned Users Card */}
                  <div className={`p-6 border rounded-2xl flex flex-col justify-between h-28 transition-all ${theme === 'light'
                    ? 'bg-slate-50/50 border-slate-200/80 text-slate-800 shadow-xs'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-100'
                    }`}>
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>{t.bannedUsers}</span>
                    <h4 className="text-3xl font-extrabold text-rose-500">{stats.bannedUsers}</h4>
                  </div>

                  {/* Total Messages Card */}
                  <div className={`p-6 border rounded-2xl flex flex-col justify-between h-28 transition-all ${theme === 'light'
                    ? 'bg-slate-50/50 border-slate-200/80 text-slate-800 shadow-xs'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-100'
                    }`}>
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>{t.totalMessages}</span>
                    <h4 className="text-3xl font-extrabold">{stats.totalMessages}</h4>
                  </div>
                </div>

                {/* System Breakdown lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h3 className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {lang === 'vi' ? 'Thông tin trò chuyện' : 'Conversations Info'}
                    </h3>
                    <div className={`divide-y ${theme === 'light' ? 'divide-slate-100' : 'divide-slate-900'}`}>
                      <div className="py-3 flex justify-between items-center text-xs">
                        <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>{t.totalConvos}</span>
                        <span className="font-bold">{stats.totalConversations}</span>
                      </div>
                      <div className="py-3 flex justify-between items-center text-xs">
                        <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>{t.directConvos}</span>
                        <span className="font-bold">{stats.directConversations}</span>
                      </div>
                      <div className="py-3 flex justify-between items-center text-xs">
                        <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>{t.groupConvos}</span>
                        <span className="font-bold">{stats.groupConversations}</span>
                      </div>
                    </div>
                  </div>

                  {/* System details */}
                  <div className="space-y-4">
                    <h3 className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {lang === 'vi' ? 'Nhật ký máy chủ' : 'System Logs'}
                    </h3>
                    <div className={`rounded-xl p-4 text-[11px] leading-relaxed border ${theme === 'light' ? 'bg-[#fbfbfa] border-slate-200 text-slate-600' : 'bg-slate-900/30 border-slate-800 text-slate-400'
                      }`}>
                      <div className="text-blue-500 font-bold">INFO: System started successfully.</div>
                      <div>DATABASE: Connected to MongoDB replica.</div>
                      <div>AUTHENTICATION: JWT verification key loaded.</div>
                      <div className="text-emerald-500">SEED: Seeding default test users completed.</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-xs text-slate-500 py-12">Loading stats...</p>
            )}
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-100">
            {error && (
              <div className="p-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 ${theme === 'light' ? 'border-slate-100' : 'border-slate-900'
              }`}>
              {/* Filters Tabs */}
              <div className={`flex gap-1 p-1 rounded-xl w-fit ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-900'
                }`}>
                {(['all', 'admin', 'user', 'banned'] as const).map(f => {
                  const label = f === 'all' ? (lang === 'vi' ? 'Tất cả' : 'All')
                    : f === 'admin' ? (lang === 'vi' ? 'Quản trị viên' : 'Admin')
                      : f === 'user' ? (lang === 'vi' ? 'Thành viên' : 'User')
                        : (lang === 'vi' ? 'Bị khóa' : 'Banned');
                  return (
                    <button
                      key={f}
                      onClick={() => setUserFilter(f)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${userFilter === f
                        ? (theme === 'light' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40' : 'bg-slate-800 text-white')
                        : (theme === 'light' ? 'text-slate-500 hover:text-slate-850' : 'text-slate-400 hover:text-slate-200')
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar Input */}
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={lang === 'vi' ? 'Tìm thành viên...' : 'Search users...'}
                  className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors ${theme === 'light' ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500'
                    }`}
                />
              </div>
            </div>

            {loading ? (
              <p className="text-center text-xs text-slate-500 py-12">Loading users...</p>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b text-[9px] font-bold uppercase tracking-widest ${theme === 'light' ? 'border-slate-200 text-slate-400' : 'border-slate-900 text-slate-500'
                      }`}>
                      <th className="px-4 py-3">{t.displayName}</th>
                      <th className="px-4 py-3">{t.username}</th>
                      <th className="px-4 py-3">{t.phone}</th>
                      <th className="px-4 py-3">{t.role}</th>
                      <th className="px-4 py-3">{t.status}</th>
                      <th className="px-4 py-3 text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id} className={`border-b transition-colors ${theme === 'light' ? 'border-slate-100 hover:bg-slate-50/50' : 'border-slate-900/60 hover:bg-slate-900/20'
                        }`}>
                        <td className="px-4 py-3 flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-[10px] overflow-hidden shrink-0 ${theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-350'
                            }`}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{u.displayName ? u.displayName.slice(0, 2).toUpperCase() : 'US'}</span>
                            )}
                          </div>
                          <span className={`font-semibold ${theme === 'light' ? 'text-slate-850' : 'text-slate-205'}`}>{u.displayName}</span>
                        </td>
                        <td className={`px-4 py-3 text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{u.username}</td>
                        <td className={`px-4 py-3 text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{u.phone}</td>
                        <td className="px-4 py-3">
                          {u.role === 'admin' ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${theme === 'light'
                              ? 'bg-amber-50/60 border-amber-200/50 text-amber-750 text-amber-700'
                              : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                              }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>{lang === 'vi' ? 'Quản trị viên' : 'Admin'}</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${theme === 'light'
                              ? 'bg-slate-50 border-slate-200/60 text-slate-600'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>{lang === 'vi' ? 'Thành viên' : 'User'}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.isBanned ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${theme === 'light'
                              ? 'bg-rose-50/60 border-rose-200/50 text-rose-700'
                              : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                              }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>{t.banned}</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${theme === 'light'
                              ? 'bg-emerald-50/60 border-emerald-200/50 text-emerald-700'
                              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                              }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{t.active}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1.5 min-h-[36px]">
                          {(() => {
                            const isSelf = u._id === currentUser?._id || u._id === currentUser?.id;
                            if (isSelf) {
                              return (
                                <span className={`text-[11px] font-semibold select-none pr-2.5 ${
                                  theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                  {lang === 'vi' ? 'Tài khoản của bạn' : 'Your account'}
                                </span>
                              );
                            }
                            return (
                              <>
                                {/* Toggle Admin Role */}
                                <button
                                  onClick={() => handleToggleRole(u._id)}
                                  className={`p-1.5 rounded-lg cursor-pointer transition-colors border ${theme === 'light'
                                    ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-600 shadow-xs'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-amber-400'
                                    }`}
                                  title={u.role === 'admin' ? t.removeAdmin : t.makeAdmin}
                                >
                                  <IconArrowLeftRight size={13} />
                                </button>

                                {/* Toggle Ban status */}
                                <button
                                  onClick={() => handleToggleBan(u._id)}
                                  className={`p-1.5 rounded-lg cursor-pointer transition-colors border ${u.isBanned
                                    ? (theme === 'light' ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100/60 shadow-xs' : 'bg-green-950/20 border-green-900/60 text-green-400 hover:bg-green-900')
                                    : (theme === 'light' ? 'bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 shadow-xs' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-rose-400')
                                    }`}
                                  title={u.isBanned ? t.unbanUser : t.banUser}
                                >
                                  <IconBan size={13} />
                                </button>
                              </>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
