import { useState, useEffect, useRef } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ContextMenu } from './components/ContextMenu';
import { ShareModal } from './components/ShareModal';
import { ProfileModal } from './components/ProfileModal';
import { connectSocket, disconnectSocket, getSocket } from './socket';

function App() {
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
  const [activeTab, setActiveTab] = useState<'chats' | 'friends'>('chats');
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);

  // Modals & Menu states
  const [profileOpen, setProfileOpen] = useState(false);
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
      let response = await originalFetch(input, init);

      const urlStr = typeof input === 'string' ? input : (input as any).url || '';

      if (response.status === 401 && !urlStr.includes('/auth/refresh') && !urlStr.includes('/auth/login') && !urlStr.includes('/auth/register')) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          if (!activeRefreshPromise) {
            activeRefreshPromise = (async () => {
              try {
                const refreshRes = await originalFetch('http://localhost:3000/auth/refresh', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken }),
                });

                if (refreshRes.ok) {
                  const refreshData = await refreshRes.json();
                  const newAccessToken = refreshData.accessToken;
                  const newRefreshToken = refreshData.refreshToken;

                  localStorage.setItem('token', newAccessToken);
                  if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                  }
                  return newAccessToken;
                }
              } catch (e) {
                console.error('Failed refreshing token:', e);
              }
              return null;
            })();
          }

          const newAccessToken = await activeRefreshPromise;
          // Reset the active refresh promise once completed
          activeRefreshPromise = null;

          if (newAccessToken) {
            setToken(newAccessToken);

            const newInit = { ...init };
            const authHeader = `Bearer ${newAccessToken}`;
            if (newInit.headers) {
              if (newInit.headers instanceof Headers) {
                newInit.headers.set('Authorization', authHeader);
              } else if (Array.isArray(newInit.headers)) {
                const authIdx = newInit.headers.findIndex(h => h[0].toLowerCase() === 'authorization');
                if (authIdx !== -1) {
                  newInit.headers[authIdx][1] = authHeader;
                } else {
                  newInit.headers.push(['Authorization', authHeader]);
                }
              } else {
                (newInit.headers as any)['Authorization'] = authHeader;
              }
            } else {
              newInit.headers = { 'Authorization': authHeader };
            }

            return originalFetch(input, newInit);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            disconnectSocket();
          }
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
      const res = await fetch('http://localhost:3000/friends', {
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
      const inRes = await fetch('http://localhost:3000/friend-requests/pending/incoming', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (inRes.ok) {
        const inData = await inRes.json();
        setIncomingRequests(inData);
        setIncomingRequestsCount(inData.length);
      }

      const outRes = await fetch('http://localhost:3000/friend-requests/pending/outgoing', {
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
          const res = await fetch('http://localhost:3000/users/me', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setToken(savedToken);
            localStorage.setItem('user', JSON.stringify(userData));

            // Pre-fetch friends list and requests
            fetchFriendsList(savedToken);
            fetchFriendRequests(savedToken);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
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
      const res = await fetch('http://localhost:3000/conversations', {
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
      const res = await fetch(`http://localhost:3000/messages/${cId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Backend returns newest messages first, reverse to show chronological order
        setMessages(data.reverse());
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Fetch pinned messages for selected chat
  const fetchPinnedMessages = async (cId: string, authToken: string) => {
    try {
      const res = await fetch(`http://localhost:3000/messages/${cId}/pinned`, {
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
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActiveConversation(null);
    disconnectSocket();
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
      const res = await fetch(`http://localhost:3000/conversations/${cId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const updated = await res.json();
        // Update local conversations list
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
      const res = await fetch(`http://localhost:3000/messages/${messageId}/pin`, {
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
      await fetch(`http://localhost:3000/messages/${messageId}/revoke`, {
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
      const res = await fetch('http://localhost:3000/conversations/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const convo = await res.json();
        // Refresh conversations
        await fetchConversations(token);
        // Set active conversation
        setActiveConversation(convo);
        // Switch tab to chats
        setActiveTab('chats');
      }
    } catch (err) {
      console.error('Error starting direct chat:', err);
    }
  };

  const handleShareConfirm = async (targetConversationIds: string[]) => {
    if (!token || !shareTargetMessage) return;
    try {
      const res = await fetch('http://localhost:3000/messages/share', {
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
        // Refresh conversations to show shared message preview
        fetchConversations(token);
      }
    } catch (err) {
      console.error('Error sharing message:', err);
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

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      
      {/* Sidebar Navigation & Chat list */}
      <Sidebar
        user={user}
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversation}
        onOpenProfile={() => setProfileOpen(true)}
        onLogout={handleLogout}
        onTogglePin={handleTogglePinConversation}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        incomingRequestsCount={incomingRequestsCount}
        setIncomingRequestsCount={setIncomingRequestsCount}
        onStartDirectChat={handleStartDirectChat}
        token={token}
        friendsList={friendsList}
        setFriendsList={setFriendsList}
        incomingRequests={incomingRequests}
        setIncomingRequests={setIncomingRequests}
        outgoingRequests={outgoingRequests}
        setOutgoingRequests={setOutgoingRequests}
      />

      {/* Active Conversation Main Area */}
      {activeConversation ? (
        <ChatArea
          user={user}
          activeConversation={activeConversation}
          messages={messages}
          pinnedMessages={pinnedMessages}
          onSendMessage={handleSendMessage}
          onContextMenu={(e, msg) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
          }}
          token={token}
          onTogglePinConversation={handleTogglePinConversation}
          onTogglePinMessage={handleTogglePinMessage}
          replyToMessage={replyToMessage}
          onClearReply={() => setReplyToMessage(null)}
          friendsList={friendsList}
          incomingRequests={incomingRequests}
          outgoingRequests={outgoingRequests}
          onFriendStatusChange={() => {
            fetchFriendsList(token);
            fetchFriendRequests(token);
            fetchConversations(token);
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
          <p className="text-base font-medium">Select a conversation or check friends to start chatting</p>
        </div>
      )}

      {/* Modals & Popovers */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          currentUserId={user._id || user.id}
          onClose={() => setContextMenu(null)}
          onReply={() => setReplyToMessage(contextMenu.message)}
          onShare={() => setShareTargetMessage(contextMenu.message)}
          onRevoke={() => handleRevokeMessage(contextMenu.message._id)}
          onTogglePin={() => handleTogglePinMessage(contextMenu.message._id, !contextMenu.message.isPinned)}
          isFriend={isFriendOfConvo}
        />
      )}

      {shareTargetMessage && (
        <ShareModal
          conversations={conversations}
          messagePreview={shareTargetMessage.content || '[Media file]'}
          onClose={() => setShareTargetMessage(null)}
          onShareConfirm={handleShareConfirm}
        />
      )}

      {profileOpen && (
        <ProfileModal
          user={user}
          token={token}
          onClose={() => setProfileOpen(false)}
          onProfileUpdated={setUser}
        />
      )}

    </div>
  );
}

export default App;
