import { useState, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../socket';
import { API_URL } from '../config';

export function useChatManager() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);

  // Tabs & Navigation states
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'blocked'>('chats');
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);

  // Modals & Menu states
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [shareTargetMessage, setShareTargetMessage] = useState<any | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: any } | null>(null);

  // Refs for socket callbacks to avoid stale closures
  const activeConversationRef = useRef<any>(null);
  activeConversationRef.current = activeConversation;

  // Global fetch interceptor for silent token refresh
  useEffect(() => {
    const originalFetch = window.fetch;
    let activeRefreshPromise: Promise<string | null> | null = null;

    window.fetch = async function (input, init) {
      const newInit = init ? { ...init } : {};
      if (!newInit.credentials) {
        newInit.credentials = 'include';
      }

      let response = await originalFetch(input, newInit);

      const urlStr = typeof input === 'string' ? input : (input as any).url || '';

      if (response.status === 401 && !urlStr.includes('/auth/refresh') && !urlStr.includes('/auth/login') && !urlStr.includes('/auth/register')) {
        if (!activeRefreshPromise) {
          activeRefreshPromise = (async () => {
            try {
              const refreshRes = await originalFetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
              });

              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const newAccessToken = refreshData.accessToken;
                localStorage.setItem('token', newAccessToken);
                return newAccessToken;
              }
            } catch (e) {
              console.error('Failed refreshing token:', e);
            }
            return null;
          })();
        }

        const newAccessToken = await activeRefreshPromise;
        activeRefreshPromise = null;

        if (newAccessToken) {
          setToken(newAccessToken);

          const retryInit = { ...newInit };
          const authHeader = `Bearer ${newAccessToken}`;
          if (retryInit.headers) {
            if (retryInit.headers instanceof Headers) {
              retryInit.headers.set('Authorization', authHeader);
            } else if (Array.isArray(retryInit.headers)) {
              const authIdx = retryInit.headers.findIndex(h => h[0].toLowerCase() === 'authorization');
              if (authIdx !== -1) {
                retryInit.headers[authIdx][1] = authHeader;
              } else {
                retryInit.headers.push(['Authorization', authHeader]);
              }
            } else {
              (retryInit.headers as any)['Authorization'] = authHeader;
            }
          } else {
            retryInit.headers = { 'Authorization': authHeader };
          }

          return originalFetch(input, retryInit);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          disconnectSocket();
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const fetchFriendsList = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/friends`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriendsList(data);
      }
    } catch (err) {
      console.error('Error fetching friends list:', err);
    }
  };

  const fetchFriendRequests = async (authToken: string) => {
    try {
      const inRes = await fetch(`${API_URL}/friend-requests/pending/incoming`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (inRes.ok) {
        const inData = await inRes.json();
        setIncomingRequests(inData);
        setIncomingRequestsCount(inData.length);
      }

      const outRes = await fetch(`${API_URL}/friend-requests/pending/outgoing`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (outRes.ok) {
        const outData = await outRes.json();
        setOutgoingRequests(outData);
      }
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    }
  };

  // Verify token & auto-login on load
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const res = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setToken(savedToken);
            localStorage.setItem('user', JSON.stringify(userData));

            if (userData && userData.role === 'admin') {
              setAdminOpen(true);
            }

            // Pre-fetch friends list and requests
            fetchFriendsList(savedToken);
            fetchFriendRequests(savedToken);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            setActiveConversation(null);
            disconnectSocket();
          }
        } catch (err) {
          console.error('Failed to validate token on load:', err);
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      }
    };
    initAuth();
  }, []);

  // Fetch conversations list
  const fetchConversations = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/conversations`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  // Fetch message history for selected chat
  const fetchMessages = async (cId: string, authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/messages/${cId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.reverse());
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Fetch pinned messages for selected chat
  const fetchPinnedMessages = async (cId: string, authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/messages/${cId}/pinned`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPinnedMessages(data);
      }
    } catch (err) {
      console.error('Error fetching pinned messages:', err);
    }
  };

  // Handle Socket events
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    fetchConversations(token);
    fetchFriendsList(token);
    fetchFriendRequests(token);
    const socket = connectSocket(token);

    socket.on('connect', () => {
      console.log('Connected to real-time chat gateway');
    });

    socket.on('new-message', (message: any) => {
      const active = activeConversationRef.current;
      if (active && message.conversationId === active._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
      fetchConversations(token);
    });

    socket.on('message-revoked', (data: { messageId: string }) => {
      setMessages(prev =>
        prev.map(m => m._id === data.messageId ? { ...m, isRevoked: true, content: null, isPinned: false } : m)
      );
      const active = activeConversationRef.current;
      if (active) {
        fetchPinnedMessages(active._id, token);
      }
      fetchConversations(token);
    });

    socket.on('message-pinned', (updatedMsg: any) => {
      const active = activeConversationRef.current;
      if (active && updatedMsg.conversationId === active._id) {
        fetchPinnedMessages(active._id, token);
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
      }
    });

    socket.on('message-seen', (data: { conversationId: string; userId: string; messageId: string; seenByUserIds: string[] }) => {
      const active = activeConversationRef.current;
      if (active && data.conversationId === active._id) {
        setMessages(prev => {
          const targetMsg = prev.find(m => m._id === data.messageId);
          if (!targetMsg) return prev;

          const targetTime = new Date(targetMsg.createdAt).getTime();

          return prev.map(m => {
            const mTime = new Date(m.createdAt).getTime();
            const isOwnMessageOfViewer = (m.senderId?._id || m.senderId) === data.userId;

            if (mTime <= targetTime && !isOwnMessageOfViewer) {
              const currentSeen = m.seenByUserIds || [];
              if (!currentSeen.includes(data.userId)) {
                return {
                  ...m,
                  seenByUserIds: [...currentSeen, data.userId]
                };
              }
            }
            return m;
          });
        });
      }
    });

    socket.on('user-status', (data: { userId: string; isOnline: boolean; lastActiveAt?: string }) => {
      setConversations(prev => prev.map(c => {
        const updatedParticipants = c.participants.map((p: any) => {
          const pId = p.userId?._id || p.userId;
          if (pId === data.userId) {
            const userObj = p.userId && typeof p.userId === 'object' ? p.userId : {};
            return {
              ...p,
              userId: {
                ...userObj,
                isOnline: data.isOnline,
                lastActiveAt: data.lastActiveAt || (data.isOnline ? null : new Date().toISOString())
              }
            };
          }
          return p;
        });
        return {
          ...c,
          participants: updatedParticipants
        };
      }));

      setActiveConversation((prevActive: any) => {
        if (!prevActive) return null;
        const updatedParticipants = prevActive.participants.map((p: any) => {
          const pId = p.userId?._id || p.userId;
          if (pId === data.userId) {
            const userObj = p.userId && typeof p.userId === 'object' ? p.userId : {};
            return {
              ...p,
              userId: {
                ...userObj,
                isOnline: data.isOnline,
                lastActiveAt: data.lastActiveAt || (data.isOnline ? null : new Date().toISOString())
              }
            };
          }
          return p;
        });
        return {
          ...prevActive,
          participants: updatedParticipants
        };
      });
    });

    socket.on('new-friend-request', () => {
      fetchFriendRequests(token);
    });

    socket.on('friend-request-accepted', () => {
      fetchConversations(token);
      fetchFriendsList(token);
      fetchFriendRequests(token);
    });

    return () => {
      disconnectSocket();
    };
  }, [token]);

  // Load message history and pinned messages when active conversation switches
  useEffect(() => {
    if (activeConversation && token) {
      fetchMessages(activeConversation._id, token);
      fetchPinnedMessages(activeConversation._id, token);
    } else {
      setMessages([]);
      setPinnedMessages([]);
    }
  }, [activeConversation, token]);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    fetchFriendsList(newToken);
    fetchFriendRequests(newToken);
    if (loggedUser && loggedUser.role === 'admin') {
      setAdminOpen(true);
    }
  };

  const handleLogout = async () => {
    const currentTheme = localStorage.getItem('theme');
    const currentLang = localStorage.getItem('lang');

    localStorage.clear();
    sessionStorage.clear();

    if (currentTheme) localStorage.setItem('theme', currentTheme);
    if (currentLang) localStorage.setItem('lang', currentLang);

    setToken(null);
    setUser(null);
    setActiveConversation(null);
    setConversations([]);
    setFriendsList([]);
    setIncomingRequests([]);
    setOutgoingRequests([]);
    setPinnedMessages([]);
    setReplyToMessage(null);
    setShareTargetMessage(null);

    disconnectSocket();

    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Failed to clear session on backend:', err);
    }
  };

  const handleSendMessage = (content: string | null, parentId?: string, attachments?: string[], type?: string) => {
    const socket = getSocket();
    if (socket && activeConversation) {
      socket.emit('send-message', {
        conversationId: activeConversation._id,
        content,
        parentId,
        attachments,
        type: type || 'text',
      });
    }
  };

  const handleTogglePinConversation = async (cId: string, pin: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/conversations/${cId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => prev.map(c => c._id === cId ? updated : c));
        if (activeConversation && activeConversation._id === cId) {
          setActiveConversation(updated);
        }
      } else {
        const errData = await res.json();
        alert(errData.message || 'Could not toggle pin status');
      }
    } catch (err) {
      console.error('Error toggling conversation pin:', err);
    }
  };

  const handleTogglePinMessage = async (messageId: string, pin: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/messages/${messageId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMessages(prev => prev.map(m => m._id === messageId ? updated : m));
        if (activeConversation) {
          fetchPinnedMessages(activeConversation._id, token);
        }
      } else {
        const errData = await res.json();
        alert(errData.message || 'Could not pin/unpin message');
      }
    } catch (err) {
      console.error('Error toggling pin message:', err);
    }
  };

  const handleRevokeMessage = async (messageId: string) => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/messages/${messageId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error revoking message:', err);
    }
  };

  const handleStartDirectChat = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/conversations/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const convo = await res.json();
        await fetchConversations(token);
        setActiveConversation(convo);
        setActiveTab('chats');
      }
    } catch (err) {
      console.error('Error starting direct chat:', err);
    }
  };

  const handleShareConfirm = async (targetConversationIds: string[]) => {
    if (!token || !shareTargetMessage) return;
    try {
      const res = await fetch(`${API_URL}/messages/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageId: shareTargetMessage._id,
          targetConversationIds,
        }),
      });

      if (res.ok) {
        setShareTargetMessage(null);
        fetchConversations(token);
      }
    } catch (err) {
      console.error('Error sharing message:', err);
    }
  };

  const handleDeleteConversation = async (cId: string) => {
    if (!token) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện này? Thao tác này chỉ xóa ở phía bạn, đối phương vẫn xem được lịch sử cũ.')) return;
    try {
      const res = await fetch(`${API_URL}/conversations/${cId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchConversations(token);
        if (activeConversation && activeConversation._id === cId) {
          setActiveConversation(null);
        }
      } else {
        const errData = await res.json();
        alert(errData.message || 'Không thể xóa cuộc trò chuyện');
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  const isDirectChat = activeConversation?.type === 'direct';
  const otherParticipant = isDirectChat
    ? activeConversation.participants.find((p: any) => {
      const pId = p.userId?._id || p.userId;
      const myId = user?._id || user?.id;
      return pId !== myId;
    })
    : null;
  const otherUserId = otherParticipant?.userId?._id || otherParticipant?.userId;
  const isFriendOfConvo = !activeConversation || !isDirectChat || !!(otherUserId && friendsList.some(f => (f._id || f.id) === otherUserId.toString()));

  const [theme, setTheme] = useState<'light' | 'dark'>((localStorage.getItem('theme') as any) || 'light');
  const [lang, setLang] = useState<'vi' | 'en'>((localStorage.getItem('lang') as any) || 'vi');

  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);

  useEffect(() => {
    if (isDirectChat && otherUserId && token) {
      fetch(`${API_URL}/blocked-users/check/${otherUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setBlockedByMe(data.blockedByMe || false);
          setBlockedByThem(data.blockedByThem || false);
        })
        .catch(err => {
          console.error('Failed to check block status:', err);
          setBlockedByMe(false);
          setBlockedByThem(false);
        });
    } else {
      setBlockedByMe(false);
      setBlockedByThem(false);
    }
  }, [isDirectChat, otherUserId, token, activeConversation]);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light' : '';
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  const toggleLang = () => {
    const next = lang === 'vi' ? 'en' : 'vi';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  return {
    token,
    user,
    setUser,
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    pinnedMessages,
    friendsList,
    setFriendsList,
    incomingRequests,
    setIncomingRequests,
    outgoingRequests,
    setOutgoingRequests,
    activeTab,
    setActiveTab,
    incomingRequestsCount,
    setIncomingRequestsCount,
    profileOpen,
    setProfileOpen,
    adminOpen,
    setAdminOpen,
    replyToMessage,
    setReplyToMessage,
    shareTargetMessage,
    setShareTargetMessage,
    contextMenu,
    setContextMenu,
    handleLoginSuccess,
    handleLogout,
    handleSendMessage,
    handleTogglePinConversation,
    handleTogglePinMessage,
    handleRevokeMessage,
    handleStartDirectChat,
    handleShareConfirm,
    handleDeleteConversation,
    fetchConversations,
    fetchFriendsList,
    fetchFriendRequests,
    isFriendOfConvo,
    theme,
    toggleTheme,
    lang,
    toggleLang,
    blockedByMe,
    setBlockedByMe,
    blockedByThem,
    setBlockedByThem,
  };
}

