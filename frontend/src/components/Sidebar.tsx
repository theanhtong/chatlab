import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import {
  IconMessage, IconLogout, IconSettings, IconSearch,
  IconPin, IconDotsVertical, IconUsers, IconUserPlus,
  IconCheck, IconX, IconUserMinus, IconMessageCircle2,
  IconUser, IconChevronRight, IconTrash, IconShield
} from '@tabler/icons-react';

interface SidebarProps {
  user: any;
  conversations: any[];
  activeConversation: any | null;
  onSelectConversation: (c: any) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onTogglePin: (cId: string, pin: boolean) => void;
  onDeleteConversation: (cId: string) => void;
  activeTab: 'chats' | 'friends';
  setActiveTab: (tab: 'chats' | 'friends') => void;
  incomingRequestsCount: number;
  setIncomingRequestsCount: (count: number) => void;
  onStartDirectChat: (targetUserId: string) => void;
  token: string;
  friendsList: any[];
  setFriendsList: React.Dispatch<React.SetStateAction<any[]>>;
  incomingRequests: any[];
  setIncomingRequests: React.Dispatch<React.SetStateAction<any[]>>;
  outgoingRequests: any[];
  setOutgoingRequests: React.Dispatch<React.SetStateAction<any[]>>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  lang: 'vi' | 'en';
  toggleLang: () => void;
  onOpenAdmin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  conversations,
  activeConversation,
  onSelectConversation,
  onOpenProfile,
  onLogout,
  onTogglePin,
  onDeleteConversation,
  activeTab,
  setActiveTab,
  incomingRequestsCount,
  setIncomingRequestsCount,
  onStartDirectChat,
  token,
  friendsList,
  setFriendsList,
  incomingRequests,
  setIncomingRequests,
  outgoingRequests,
  setOutgoingRequests,
  theme,
  toggleTheme,
  lang,
  toggleLang,
  onOpenAdmin,
}) => {
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState(false);

  // Friends Pane local states
  const [friendsSubTab, setFriendsSubTab] = useState<'list' | 'incoming' | 'outgoing'>('list');
  const [addPhone, setAddPhone] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Searched user card states
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [isSearchedUserBlocked, setIsSearchedUserBlocked] = useState(false);
  const [isFriend, setIsFriend] = useState(false);

  useEffect(() => {
    const handleCloseMenu = () => {
      setActiveMenuId(null);
      setSettingsMenuOpen(false);
      setSubMenuOpen(false);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Fetch all friends and requests data
  const fetchFriendsData = async () => {
    if (!token) return;
    setLoadingFriends(true);
    try {
      // 1. Friends list
      const fRes = await fetch(`${API_URL}/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (fRes.ok) {
        const fData = await fRes.json();
        setFriendsList(fData);
      }

      // 2. Incoming Requests
      const inRes = await fetch(`${API_URL}/friend-requests/pending/incoming`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (inRes.ok) {
        const inData = await inRes.json();
        setIncomingRequests(inData);
        setIncomingRequestsCount(inData.length);
      }

      // 3. Outgoing Requests
      const outRes = await fetch(`${API_URL}/friend-requests/pending/outgoing`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (outRes.ok) {
        const outData = await outRes.json();
        setOutgoingRequests(outData);
      }
    } catch (err) {
      console.error('Error fetching friends data:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'friends' && token) {
      fetchFriendsData();
    }
  }, [activeTab, token]);

  const checkBlockStatus = async (targetId: string) => {
    try {
      const res = await fetch(`${API_URL}/blocked-users/check/${targetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsSearchedUserBlocked(data.blocked);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPhone.trim()) return;

    setAddLoading(true);
    setAddMessage(null);
    setSearchedUser(null);

    try {
      const res = await fetch(`${API_URL}/users/search-phone/${addPhone}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setSearchedUser(data);
        const myId = user._id || user.id;
        const searchedId = data._id || data.id;
        if (myId === searchedId) {
          setIsFriend(false);
          setIsSearchedUserBlocked(false);
        } else {
          setIsFriend(friendsList.some(f => f._id === searchedId));
          checkBlockStatus(searchedId);
        }
      } else {
        throw new Error(data.message || 'Không tìm thấy người dùng với số điện thoại này');
      }
    } catch (err: any) {
      setAddMessage({ text: err.message || 'Không tìm thấy người dùng', isError: true });
    } finally {
      setAddLoading(false);
    }
  };

  const handleSendRequestFromCard = async () => {
    if (!searchedUser) return;
    try {
      const res = await fetch(`${API_URL}/friend-requests/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: searchedUser.phone }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchFriendsData();
      } else {
        throw new Error(data.message || 'Không thể gửi lời mời kết bạn');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi kết bạn');
    }
  };

  const handleToggleBlockFromCard = async () => {
    if (!searchedUser) return;
    const url = `${API_URL}/blocked-users${isSearchedUserBlocked ? '/unblock' : ''}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ blockedUserId: searchedUser._id }),
      });
      if (res.ok) {
        setIsSearchedUserBlocked(!isSearchedUserBlocked);
        alert(isSearchedUserBlocked ? 'Đã bỏ chặn người dùng thành công!' : 'Đã chặn người dùng thành công!');
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Thao tác chặn thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi thao tác chặn');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_URL}/friend-requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFriendsData();
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_URL}/friend-requests/${requestId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFriendsData();
      }
    } catch (err) {
      console.error('Error declining friend request:', err);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_URL}/friend-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFriendsData();
      }
    } catch (err) {
      console.error('Error cancelling friend request:', err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kết bạn với người dùng này không?')) return;
    try {
      const res = await fetch(`${API_URL}/friends/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFriendsData();
      }
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  const getConversationDetails = (c: any) => {
    if (c.type === 'direct') {
      const other = c.participants.find((p: any) => {
        const pId = p.userId?._id || p.userId;
        const myId = user._id || user.id;
        return pId !== myId;
      });
      return {
        name: other?.userId?.displayName || other?.userId?.username || 'Người dùng ChatLab',
        avatar: other?.userId?.avatar || '',
      };
    }
    return {
      name: c.name || 'Trò chuyện nhóm',
      avatar: c.avatar || '',
    };
  };

  const getParticipantInfo = (c: any) => {
    if (!c || !c.participants) return null;
    return c.participants.find((p: any) => {
      const pId = p.userId?._id || p.userId;
      const myId = user._id || user.id;
      return pId === myId;
    });
  };

  const filtered = conversations.filter(c => {
    const details = getConversationDetails(c);
    return details.name.toLowerCase().includes(search.toLowerCase());
  });

  const sortedConversations = [...filtered].sort((a, b) => {
    const partA = getParticipantInfo(a);
    const partB = getParticipantInfo(b);

    const isPinnedA = partA?.isPinned || false;
    const isPinnedB = partB?.isPinned || false;

    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;

    if (isPinnedA && isPinnedB) {
      const timeA = partA?.pinnedAt ? new Date(partA.pinnedAt).getTime() : 0;
      const timeB = partB?.pinnedAt ? new Date(partB.pinnedAt).getTime() : 0;
      return timeB - timeA;
    }

    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  const renderLastMessagePreview = (c: any) => {
    if (!c.lastMessage) return null;
    const msg = c.lastMessage;

    if (msg.isRevoked) {
      return <span className="text-slate-500 italic text-[11px]">Tin nhắn đã bị thu hồi</span>;
    }

    const sender = msg.senderId;
    const senderIdStr = sender?._id || sender;
    const myIdStr = user._id || user.id;
    const isMe = senderIdStr === myIdStr;

    let senderPrefix = '';
    if (isMe) {
      senderPrefix = 'Tôi: ';
    } else {
      const name = sender?.displayName || sender?.username || 'Người dùng';
      senderPrefix = `${name}: `;
    }

    let messageText = '';
    if (msg.type === 'image') {
      messageText = '[Hình ảnh]';
    } else if (msg.type === 'voice') {
      messageText = '[Tin nhắn thoại]';
    } else if (msg.type === 'file') {
      messageText = '[Tài liệu]';
    } else {
      messageText = msg.content || '';
    }

    return (
      <span className="text-[11px] text-slate-400 truncate block mt-0.5 max-w-[245px]">
        <span className="font-semibold text-slate-300">{senderPrefix}</span>
        {messageText}
      </span>
    );
  };

  const formatLastActive = (dateStr: string) => {
    if (!dateStr) return 'Ngoại tuyến';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa mới hoạt động';
    if (mins < 60) return `Hoạt động ${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hoạt động ${hours} giờ trước`;
    return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
  };

  const isConvoFriend = (c: any) => {
    if (!c) return false;
    if (c.type === 'group') return true;
    const other = c.participants.find((p: any) => {
      const pId = p.userId?._id || p.userId;
      const mId = user?._id || user?.id;
      return pId !== mId;
    });
    const otherUserId = other?.userId?._id || other?.userId;
    return !!(otherUserId && (friendsList || []).some(f => (f._id || f.id) === otherUserId.toString()));
  };

  const myId = user?._id || user?.id;
  const searchedId = searchedUser?._id || searchedUser?.id;
  const isMe = !!(myId && searchedId && myId === searchedId);

  const hasSentRequest = !isFriend && searchedId && (outgoingRequests || []).some((req: any) => {
    const rId = req.receiverId?._id || req.receiverId;
    return rId && rId.toString() === searchedId.toString();
  });
  const outgoingRequestObj = !isFriend && searchedId && (outgoingRequests || []).find((req: any) => {
    const rId = req.receiverId?._id || req.receiverId;
    return rId && rId.toString() === searchedId.toString();
  });

  const hasReceivedRequest = !isFriend && searchedId && (incomingRequests || []).some((req: any) => {
    const sId = req.senderId?._id || req.senderId;
    return sId && sId.toString() === searchedId.toString();
  });
  const incomingRequestObj = !isFriend && searchedId && (incomingRequests || []).find((req: any) => {
    const sId = req.senderId?._id || req.senderId;
    return sId && sId.toString() === searchedId.toString();
  });

  return (
    <div className="w-[380px] bg-slate-900 border-r border-slate-800 flex h-full text-slate-100 select-none">

      {/* 1. Left Narrow Bar */}
      <div className="w-[70px] bg-slate-955 bg-slate-950 border-r border-slate-909/60 border-slate-900/60 flex flex-col items-center py-6 justify-between shrink-0">
        <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
          {/* User Profile Avatar */}
          <button
            onClick={onOpenProfile}
            className="w-11 h-11 rounded-full bg-blue-600 border border-blue-500/35 overflow-hidden flex items-center justify-center font-bold text-sm cursor-pointer hover:opacity-90 relative group transition-all duration-300"
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              <span>{user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ME'}</span>
            )}
          </button>

          {/* Chats Icon Tab */}
          <button
            onClick={() => {
              setActiveTab('chats');
              setSearchedUser(null);
            }}
            className={`p-2.5 rounded-xl cursor-pointer transition-colors ${activeTab === 'chats'
                ? (theme === 'light' ? 'bg-blue-50 text-blue-600 border border-blue-100/55' : 'bg-slate-800 text-blue-400')
                : (theme === 'light' ? 'text-slate-550 text-slate-500 hover:bg-slate-200/80 hover:text-slate-800' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')
              }`}
            title="Tin nhắn"
          >
            <IconMessage size={22} />
          </button>

          {/* Friends Icon Tab */}
          <button
            onClick={() => setActiveTab('friends')}
            className={`p-2.5 rounded-xl cursor-pointer transition-colors relative ${activeTab === 'friends'
                ? (theme === 'light' ? 'bg-blue-50 text-blue-600 border border-blue-100/55' : 'bg-slate-800 text-blue-400')
                : (theme === 'light' ? 'text-slate-550 text-slate-500 hover:bg-slate-200/80 hover:text-slate-800' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')
              }`}
            title="Danh bạ"
          >
            <IconUsers size={22} />
            {incomingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center border border-slate-200 dark:border-slate-950 animate-bounce">
                {incomingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Settings & Logout Column at bottom */}
        <div className="flex flex-col items-center gap-3.5 pb-2 w-full">
          {/* Settings Popover Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSettingsMenuOpen(!settingsMenuOpen);
              }}
              className={`p-2.5 rounded-xl cursor-pointer transition-colors ${settingsMenuOpen
                  ? (theme === 'light' ? 'bg-blue-50 text-blue-600 border border-blue-100/55' : 'bg-slate-800 text-blue-400')
                  : (theme === 'light' ? 'text-slate-550 text-slate-500 hover:bg-slate-200/80 hover:text-slate-800' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')
                }`}
              title="Cài đặt"
            >
              <IconSettings size={22} />
            </button>

            {settingsMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-[55px] bottom-2 z-50 bg-slate-900 border border-slate-800/80 rounded-xl shadow-2xl py-1.5 w-56 text-[13px] font-normal text-slate-200 animate-in fade-in slide-in-from-left-2 duration-150 text-left shrink-0"
              >
                {/* Thông tin tài khoản */}
                <button
                  onClick={() => {
                    onOpenProfile();
                    setSettingsMenuOpen(false);
                    setSubMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left text-slate-200 cursor-pointer"
                >
                  <IconUser size={16} className="text-slate-400" />
                  <span>{lang === 'vi' ? 'Thông tin tài khoản' : 'Profile Details'}</span>
                </button>

                {/* Admin Portal */}
                {user.role === 'admin' && (
                  <button
                    onClick={() => {
                      onOpenAdmin();
                      setSettingsMenuOpen(false);
                      setSubMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left text-blue-400 font-semibold cursor-pointer"
                  >
                    <IconShield size={16} className="text-blue-500 animate-pulse" />
                    <span>{lang === 'vi' ? 'Quản trị hệ thống' : 'Admin Portal'}</span>
                  </button>
                )}

                {/* Cài đặt (Settings sub-menu toggle) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubMenuOpen(!subMenuOpen);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors text-left text-slate-200 cursor-pointer ${subMenuOpen ? 'bg-slate-800' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <IconSettings size={16} className="text-slate-400" />
                    <span>{lang === 'vi' ? 'Cài đặt' : 'Settings'}</span>
                  </div>
                  <IconChevronRight size={14} className={`text-slate-500 transition-transform ${subMenuOpen ? 'rotate-90' : ''}`} />
                </button>
              </div>
            )}

            {/* Settings Sub-Menu / Dropright */}
            {settingsMenuOpen && subMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-[284px] bottom-14 z-55 bg-slate-900 border border-slate-800/80 rounded-xl shadow-2xl py-1.5 w-48 text-[13px] font-normal text-slate-200 animate-in fade-in slide-in-from-left-2 duration-100 text-left shrink-0"
              >
                {/* Chế độ Sáng/Tối */}
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors text-left text-slate-200 cursor-pointer"
                >
                  <span>{lang === 'vi' ? 'Giao diện' : 'Appearance'}</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 uppercase font-semibold">
                    {theme === 'light' ? (lang === 'vi' ? 'Sáng' : 'Light') : (lang === 'vi' ? 'Tối' : 'Dark')}
                  </span>
                </button>

                {/* Ngôn ngữ */}
                <button
                  onClick={() => {
                    toggleLang();
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors text-left text-slate-200 cursor-pointer"
                >
                  <span>{lang === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 uppercase font-semibold">
                    {lang === 'vi' ? 'Tiếng Việt' : 'English'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className={`p-2.5 rounded-xl cursor-pointer transition-colors ${theme === 'light'
                ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'
                : 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
              }`}
            title={lang === 'vi' ? 'Đăng xuất' : 'Logout'}
          >
            <IconLogout size={22} />
          </button>
        </div>
      </div>

      {/* 2. Right Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* CHATS TAB PANELS */}
        {activeTab === 'chats' && (
          <>
            {/* Header Search */}
            <div className="h-16 border-b border-slate-800/80 flex items-center px-4 shrink-0">
              <div className="relative w-full">
                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={lang === 'vi' ? 'Tìm kiếm cuộc trò chuyện...' : 'Search conversations...'}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* List Title */}
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'vi' ? 'Cuộc trò chuyện' : 'Conversations'}
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {sortedConversations.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-12">
                  {lang === 'vi' ? 'Không có cuộc trò chuyện nào' : 'No conversations found'}
                </p>
              ) : (
                sortedConversations.map(c => {
                  const details = getConversationDetails(c);
                  const isActive = activeConversation && activeConversation._id === c._id;

                  const part = getParticipantInfo(c);
                  const isPinned = part?.isPinned;

                  // Find other user online status
                  let isOnline = false;
                  if (c.type === 'direct') {
                    const other = c.participants.find((p: any) => {
                      const pId = p.userId?._id || p.userId;
                      return pId !== (user._id || user.id);
                    });
                    isOnline = other?.userId?.isOnline || false;
                  }

                  return (
                    <div
                      key={c._id}
                      onClick={() => onSelectConversation(c)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border relative group ${isActive ? 'bg-blue-600/10 border-blue-500/20 text-white' : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
                    >
                      {/* Room Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center font-bold text-xs overflow-hidden text-slate-300">
                          {details.avatar ? (
                            <img src={details.avatar} alt={details.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{details.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        {/* Dynamic Activity status indicator */}
                        {c.type === 'direct' && isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse" />
                        )}
                      </div>

                      {/* Room details */}
                      <div className="flex-1 flex flex-col justify-center min-w-0 pr-6">
                        <span className="text-sm font-semibold truncate text-slate-200">{details.name}</span>
                        {renderLastMessagePreview(c)}
                      </div>

                      {/* Pin / Options Area */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {isPinned && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ x: rect.left, y: rect.bottom + window.scrollY });
                              setActiveMenuId(c._id);
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500 dark:text-blue-400 transition-all cursor-pointer shrink-0"
                            title="Tùy chọn ghim"
                          >
                            <IconPin size={13} className="rotate-45" />
                          </button>
                        )}

                        {isConvoFriend(c) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ x: rect.left, y: rect.bottom + window.scrollY });
                              setActiveMenuId(c._id);
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all cursor-pointer shrink-0 opacity-60 hover:opacity-100"
                            title="Thêm tùy chọn"
                          >
                            <IconDotsVertical size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* FRIENDS TAB PANELS */}
        {activeTab === 'friends' && (
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Header: Add Friend search */}
            <div className="h-16 border-b border-slate-800/80 flex items-center px-4 gap-2 shrink-0">
              <form onSubmit={handleAddFriendSubmit} className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={addPhone}
                    onChange={e => setAddPhone(e.target.value)}
                    placeholder={lang === 'vi' ? 'Nhập số điện thoại cần tìm...' : 'Enter phone number to search...'}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addLoading || !addPhone.trim()}
                  className="px-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 active:scale-95 shrink-0"
                >
                  <IconSearch size={14} />
                  <span>{lang === 'vi' ? 'Tìm' : 'Search'}</span>
                </button>
              </form>
            </div>

            {/* Results & Status Messages (Rendered below header) */}
            {(addMessage || searchedUser) && (
              <div className="p-3 border-b border-slate-800/60 bg-transparent space-y-2 shrink-0">
                {addMessage && (
                  <div className={`p-2 rounded-lg text-[10px] font-medium border ${addMessage.isError ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {addMessage.text}
                  </div>
                )}
                {searchedUser && (
                  <div className="p-3 bg-slate-955 bg-slate-950 border border-slate-808 border-slate-800 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                          {searchedUser.avatar ? (
                            <img src={searchedUser.avatar} alt={searchedUser.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{searchedUser.displayName ? searchedUser.displayName.slice(0, 2).toUpperCase() : 'US'}</span>
                          )}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-955 border-slate-950 rounded-full ${searchedUser.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-200 truncate">
                          {searchedUser.displayName || searchedUser.username}
                          {isMe && (
                            <span className="ml-1.5 text-[9px] bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded font-semibold uppercase">{lang === 'vi' ? 'Bạn' : 'You'}</span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{searchedUser.phone || (lang === 'vi' ? 'Không có SĐT' : 'No phone')}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {lang === 'vi' ? 'Trạng thái: ' : 'Status: '} <span className={searchedUser.isOnline ? 'text-green-400' : 'text-slate-400'}>{searchedUser.isOnline ? (lang === 'vi' ? 'Đang hoạt động' : 'Active') : (lang === 'vi' ? 'Ngoại tuyến' : 'Offline')}</span>
                        </p>
                      </div>
                    </div>

                    {isMe ? (
                      <div className="text-center text-[10px] text-slate-400 py-1 border-t border-slate-800/60">
                        {lang === 'vi' ? 'Đây là số điện thoại của bạn' : 'This is your phone number'}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onStartDirectChat(searchedUser._id)}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <IconMessageCircle2 size={13} />
                          <span>{lang === 'vi' ? 'Nhắn tin' : 'Message'}</span>
                        </button>

                        {!isFriend && (
                          hasSentRequest ? (
                            <button
                              onClick={() => handleCancelRequest(outgoingRequestObj._id)}
                              className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1 border border-rose-500/20"
                            >
                              <IconUserMinus size={13} />
                              <span>{lang === 'vi' ? 'Thu hồi' : 'Cancel'}</span>
                            </button>
                          ) : hasReceivedRequest ? (
                            <>
                              <button
                                onClick={() => handleAcceptRequest(incomingRequestObj._id)}
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                              >
                                <IconCheck size={13} />
                                <span>{lang === 'vi' ? 'Đồng ý' : 'Accept'}</span>
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(incomingRequestObj._id)}
                                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1 border border-slate-700/30"
                              >
                                <IconX size={13} />
                                <span>{lang === 'vi' ? 'Từ chối' : 'Decline'}</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={handleSendRequestFromCard}
                              className="flex-1 py-1.5 bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1 border border-blue-500/25"
                            >
                              <IconUserPlus size={13} />
                              <span>{lang === 'vi' ? 'Kết bạn' : 'Add Friend'}</span>
                            </button>
                          )
                        )}

                        {/* Show Block button ONLY when there are no pending requests */}
                        {!hasSentRequest && !hasReceivedRequest && (
                          <button
                            onClick={handleToggleBlockFromCard}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1 ${isSearchedUserBlocked ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-rose-600/10 text-rose-400 hover:bg-rose-600 hover:text-white'}`}
                          >
                            <span>{isSearchedUserBlocked ? (lang === 'vi' ? 'Bỏ chặn' : 'Unblock') : (lang === 'vi' ? 'Chặn' : 'Block')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tabs buttons */}
            <div className="flex justify-center border-b border-slate-200/50 dark:border-slate-800/80 px-4 bg-transparent shrink-0 gap-8">
              <button
                onClick={() => setFriendsSubTab('list')}
                className={`py-3 text-[11px] font-bold tracking-wider uppercase cursor-pointer transition-all border-b-2 ${friendsSubTab === 'list'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                {lang === 'vi' ? 'Bạn bè' : 'Friends'} ({friendsList.length})
              </button>
              <button
                onClick={() => setFriendsSubTab('incoming')}
                className={`py-3 text-[11px] font-bold tracking-wider uppercase cursor-pointer transition-all border-b-2 relative ${friendsSubTab === 'incoming'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                {lang === 'vi' ? 'Lời mời' : 'Requests'} ({incomingRequests.length})
                {incomingRequests.length > 0 && (
                  <span className="absolute top-2.5 -right-2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setFriendsSubTab('outgoing')}
                className={`py-3 text-[11px] font-bold tracking-wider uppercase cursor-pointer transition-all border-b-2 ${friendsSubTab === 'outgoing'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                {lang === 'vi' ? 'Đã gửi' : 'Sent'} ({outgoingRequests.length})
              </button>
            </div>

            {/* List panel */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
              {loadingFriends ? (
                <p className="text-center text-xs text-slate-500 py-12">{lang === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
              ) : (
                <>
                  {/* Friends List */}
                  {friendsSubTab === 'list' && (
                    friendsList.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-12">
                        {lang === 'vi'
                          ? 'Chưa có bạn bè nào. Hãy kết bạn bằng số điện thoại ở trên!'
                          : 'No friends yet. Add friends using the phone number search above!'}
                      </p>
                    ) : (
                      friendsList.map(friend => {
                        const isOnline = friend.isOnline;
                        return (
                          <div key={friend._id} className="flex items-center justify-between p-2 bg-slate-850/30 hover:bg-slate-855/60 hover:bg-slate-850/60 border border-slate-855/50 border-slate-850/50 rounded-xl transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                                  {friend.avatar ? (
                                    <img src={friend.avatar} alt={friend.displayName} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{friend.displayName ? friend.displayName.slice(0, 2).toUpperCase() : 'FR'}</span>
                                  )}
                                </div>
                                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border border-slate-900 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate">{friend.displayName || friend.username}</p>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {isOnline ? (lang === 'vi' ? 'Đang hoạt động' : 'Active') : formatLastActive(friend.lastActiveAt)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onStartDirectChat(friend._id)}
                                className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title={lang === 'vi' ? 'Nhắn tin' : 'Message'}
                              >
                                <IconMessageCircle2 size={14} />
                              </button>
                              <button
                                onClick={() => handleRemoveFriend(friend._id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title={lang === 'vi' ? 'Hủy kết bạn' : 'Unfriend'}
                              >
                                <IconUserMinus size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}

                  {/* Incoming Requests */}
                  {friendsSubTab === 'incoming' && (
                    incomingRequests.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-12">
                        {lang === 'vi' ? 'Không có lời mời kết bạn nào cần duyệt' : 'No incoming friend requests'}
                      </p>
                    ) : (
                      incomingRequests.map(req => {
                        const sender = req.senderId;
                        if (!sender) return null;
                        return (
                          <div key={req._id} className="flex items-center justify-between p-2 bg-slate-850/30 border border-slate-850/50 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                                {sender.avatar ? (
                                  <img src={sender.avatar} alt={sender.displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{sender.displayName ? sender.displayName.slice(0, 2).toUpperCase() : 'IN'}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate">{sender.displayName || sender.username}</p>
                                <p className="text-[9px] text-slate-500 truncate mt-0.5">
                                  {lang === 'vi' ? 'Muốn kết bạn với bạn' : 'Wants to be friends'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleAcceptRequest(req._id)}
                                className="p-1.5 bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/25 rounded-lg transition-colors cursor-pointer"
                                title={lang === 'vi' ? 'Đồng ý' : 'Accept'}
                              >
                                <IconCheck size={14} />
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(req._id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                title={lang === 'vi' ? 'Từ chối' : 'Decline'}
                              >
                                <IconX size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}

                  {/* Outgoing Requests */}
                  {friendsSubTab === 'outgoing' && (
                    outgoingRequests.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-12">
                        {lang === 'vi' ? 'Không có yêu cầu kết bạn nào đang chờ duyệt' : 'No pending outgoing requests'}
                      </p>
                    ) : (
                      outgoingRequests.map(req => {
                        const receiver = req.receiverId;
                        if (!receiver) return null;
                        return (
                          <div key={req._id} className="flex items-center justify-between p-2 bg-slate-850/30 border border-slate-850/50 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                                {receiver.avatar ? (
                                  <img src={receiver.avatar} alt={receiver.displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{receiver.displayName ? receiver.displayName.slice(0, 2).toUpperCase() : 'OUT'}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate">{receiver.displayName || receiver.username}</p>
                                <p className="text-[9px] text-slate-500 truncate mt-0.5">
                                  {lang === 'vi' ? 'Đang chờ đối phương chấp nhận' : 'Waiting for approval'}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleCancelRequest(req._id)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0"
                              title={lang === 'vi' ? 'Thu hồi yêu cầu kết bạn' : 'Cancel request'}
                            >
                              {lang === 'vi' ? 'Thu hồi' : 'Cancel'}
                            </button>
                          </div>
                        );
                      })
                    )
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Left-click Menu for conversations */}
      {activeMenuId && menuPosition && isConvoFriend(conversations.find(c => c._id === activeMenuId)) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 bg-slate-950 border border-slate-800 rounded-xl shadow-xl py-1 w-44 text-xs font-medium text-slate-200 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: menuPosition.y + 4, left: menuPosition.x - 140 }}
        >
          <button
            onClick={() => {
              const convo = conversations.find(c => c._id === activeMenuId);
              const part = getParticipantInfo(convo);
              onTogglePin(activeMenuId, !part?.isPinned);
              setActiveMenuId(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-850 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
          >
            <IconPin size={14} className="text-slate-400 rotate-45" />
            <span>
              {getParticipantInfo(conversations.find(c => c._id === activeMenuId))?.isPinned
                ? (lang === 'vi' ? 'Bỏ ghim cuộc trò chuyện' : 'Unpin conversation')
                : (lang === 'vi' ? 'Ghim cuộc trò chuyện' : 'Pin conversation')}
            </span>
          </button>

          <button
            onClick={() => {
              onDeleteConversation(activeMenuId);
              setActiveMenuId(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-850 hover:text-rose-400 text-rose-500 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-800/60 mt-1 pt-2 animate-fade-in"
          >
            <IconTrash size={14} />
            <span>{lang === 'vi' ? 'Xóa lịch sử trò chuyện' : 'Delete chat history'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
