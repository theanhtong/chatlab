import React, { useState, useRef, useEffect } from 'react';
import {
  IconPin, IconSend, IconPaperclip,
  IconMicrophone, IconX, IconCircleDot,
  IconChevronDown, IconChevronUp
} from '@tabler/icons-react';
import { getSocket } from '../socket';
import { API_URL } from '../config';

interface ChatAreaProps {
  user: any;
  activeConversation: any;
  messages: any[];
  pinnedMessages: any[];
  onSendMessage: (content: string | null, parentId?: string, attachments?: string[], type?: string) => void;
  onContextMenu: (e: React.MouseEvent, message: any) => void;
  token: string;
  onTogglePinMessage: (messageId: string, pin: boolean) => void;
  replyToMessage: any | null;
  onClearReply: () => void;
  friendsList: any[];
  incomingRequests: any[];
  outgoingRequests: any[];
  onFriendStatusChange: () => void;
  lang: 'vi' | 'en';
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  user,
  activeConversation,
  messages,
  pinnedMessages,
  onSendMessage,
  onContextMenu,
  token,
  onTogglePinMessage,
  replyToMessage,
  onClearReply,
  friendsList,
  incomingRequests,
  outgoingRequests,
  onFriendStatusChange,
  lang,
}) => {
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Emit read-message socket event when incoming messages arrive
  useEffect(() => {
    const socket = getSocket();
    if (socket && activeConversation && messages.length > 0) {
      const lastIncoming = [...messages].reverse().find(m => {
        const senderId = m.senderId?._id || m.senderId;
        const myId = user._id || user.id;
        return senderId !== myId;
      });

      if (lastIncoming) {
        socket.emit('read-message', {
          conversationId: activeConversation._id,
          messageId: lastIncoming._id,
        });
      }
    }
  }, [messages, activeConversation, user]);

  // Handle message send
  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText, replyToMessage?._id);
    setInputText('');
    onClearReply();
  };

  // Get other user or group name
  const getChatHeaderDetails = () => {
    if (activeConversation.type === 'direct') {
      const other = activeConversation.participants.find((p: any) => {
        const pId = p.userId?._id || p.userId;
        const myId = user._id || user.id;
        return pId !== myId;
      });
      return {
        name: other?.userId?.displayName || other?.userId?.username || 'Chat Lab User',
        avatar: other?.userId?.avatar || '',
      };
    }
    return {
      name: activeConversation.name || 'Group Chat',
      avatar: activeConversation.avatar || '',
    };
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const isImage = file.type.startsWith('image/');
    const url = `${API_URL}/uploads/${isImage ? 'image' : 'audio'}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      // Send message with attachment
      onSendMessage(null, replyToMessage?._id, [data.url], isImage ? 'image' : 'audio');
      onClearReply();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });

        setUploading(true);
        const formData = new FormData();
        formData.append('file', audioFile);

        try {
          const res = await fetch(`${API_URL}/uploads/audio`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Audio upload failed');

          onSendMessage(null, replyToMessage?._id, [data.url], 'audio');
          onClearReply();
        } catch (err: any) {
          alert(err.message || 'Audio upload failed');
        } finally {
          setUploading(false);
        }

        // Close stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Could not start microphone recording. Verify permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const details = getChatHeaderDetails();



  const isDirectChat = activeConversation.type === 'direct';
  const otherParticipant = isDirectChat
    ? activeConversation.participants.find((p: any) => {
      const pId = p.userId?._id || p.userId;
      const myId = user._id || user.id;
      return pId !== myId;
    })
    : null;
  const otherUserId = otherParticipant?.userId?._id || otherParticipant?.userId;
  const isFriend = !isDirectChat || (otherUserId && (friendsList || []).some(f => (f._id || f.id) === otherUserId.toString()));

  const hasSentRequest = isDirectChat && otherUserId && (outgoingRequests || []).some((req: any) => {
    const receiverId = req.receiverId?._id || req.receiverId;
    return receiverId === otherUserId.toString();
  });

  const outgoingRequestObj = isDirectChat && otherUserId && (outgoingRequests || []).find((req: any) => {
    const receiverId = req.receiverId?._id || req.receiverId;
    return receiverId === otherUserId.toString();
  });

  const incomingRequestObj = isDirectChat && otherUserId && (incomingRequests || []).find((req: any) => {
    const senderId = req.senderId?._id || req.senderId;
    return senderId === otherUserId.toString();
  });
  const hasReceivedRequest = !!incomingRequestObj;
  // Format record duration
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getSubTitleStatus = () => {
    if (activeConversation.type === 'group') {
      return `${activeConversation.participants.length} thành viên`;
    }

    const other = activeConversation.participants.find((p: any) => {
      const pId = p.userId?._id || p.userId;
      const myId = user._id || user.id;
      return pId !== myId;
    });

    const isOnline = other?.userId?.isOnline || false;
    if (isOnline) {
      return 'Đang hoạt động';
    }

    const lastActive = other?.userId?.lastActiveAt;
    if (lastActive) {
      const diff = Date.now() - new Date(lastActive).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Vừa hoạt động';
      if (mins < 60) return `Hoạt động ${mins} phút trước`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Hoạt động ${hours} giờ trước`;
      return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
    }

    return 'Ngoại tuyến';
  };

  const getOtherParticipantId = () => {
    if (activeConversation.type === 'direct') {
      const other = activeConversation.participants.find((p: any) => {
        const pId = p.userId?._id || p.userId;
        const myId = user._id || user.id;
        return pId !== myId;
      });
      return other?.userId?._id || other?.userId || null;
    }
    return null;
  };

  const otherId = getOtherParticipantId();

  const isSeen = (m: any) => {
    if (!m.seenByUserIds) return false;
    if (activeConversation.type === 'direct') {
      return otherId && m.seenByUserIds.includes(otherId.toString());
    }
    return m.seenByUserIds.length > 0;
  };

  const getSeenTooltip = (m: any) => {
    if (!m.seenByUserIds || m.seenByUserIds.length === 0) return 'Đã gửi';
    if (activeConversation.type === 'direct') {
      return 'Đã xem';
    }
    return `Đã xem bởi ${m.seenByUserIds.length} thành viên`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 min-w-0">

      {/* 1. Header Area */}
      <div className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
            {details.avatar ? (
              <img src={details.avatar} alt={details.name} className="w-full h-full object-cover" />
            ) : (
              <span>{details.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">{details.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {activeConversation.type === 'direct' && getSubTitleStatus() === 'Online' && (
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              )}
              <p className={`text-[11px] leading-none ${activeConversation.type === 'direct' && getSubTitleStatus() === 'Online' ? 'text-green-400 font-medium' : 'text-slate-400'}`}>
                {getSubTitleStatus()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Options menu or actions can be added here if needed */}
        </div>
      </div>

      {/* 1.5 Stranger Alert Bar */}
      {isDirectChat && !isFriend && (
        <div className="bg-slate-900 border-b border-slate-800/80 px-6 py-3 flex items-center justify-between text-xs text-slate-350 select-none animate-in fade-in duration-200">
          {hasSentRequest ? (
            <span className="font-medium text-slate-300">Bạn đã gửi lời mời kết bạn đến người này. Đang chờ đối phương đồng ý.</span>
          ) : hasReceivedRequest ? (
            <span className="font-medium text-slate-300">Người này đã gửi lời mời kết bạn đến bạn.</span>
          ) : (
            <span className="font-medium text-slate-300">Người này chưa có trong danh sách bạn bè của bạn.</span>
          )}

          <div className="flex items-center gap-2">
            {hasSentRequest ? (
              <button
                onClick={async () => {
                  if (!outgoingRequestObj?._id) return;
                  try {
                    const res = await fetch(`${API_URL}/friend-requests/${outgoingRequestObj._id}/cancel`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                      alert('Đã thu hồi lời mời kết bạn thành công!');
                      onFriendStatusChange();
                    } else {
                      alert('Không thể thu hồi lời mời kết bạn.');
                    }
                  } catch (err) {
                    alert('Lỗi khi thu hồi lời mời kết bạn.');
                  }
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 hover:text-white text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Thu hồi lời mời
              </button>
            ) : hasReceivedRequest ? (
              <>
                <button
                  onClick={async () => {
                    if (!incomingRequestObj?._id) return;
                    try {
                      const res = await fetch(`${API_URL}/friend-requests/${incomingRequestObj._id}/accept`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (res.ok) {
                        alert('Đã đồng ý kết bạn thành công!');
                        onFriendStatusChange();
                      } else {
                        alert('Không thể đồng ý kết bạn.');
                      }
                    } catch (err) {
                      alert('Lỗi khi đồng ý kết bạn.');
                    }
                  }}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 hover:text-white text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Đồng ý
                </button>
                <button
                  onClick={async () => {
                    if (!incomingRequestObj?._id) return;
                    try {
                      const res = await fetch(`${API_URL}/friend-requests/${incomingRequestObj._id}/decline`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (res.ok) {
                        alert('Đã từ chối kết bạn.');
                        onFriendStatusChange();
                      } else {
                        alert('Không thể từ chối kết bạn.');
                      }
                    } catch (err) {
                      alert('Lỗi khi từ chối kết bạn.');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 hover:text-slate-200 text-slate-300 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Từ chối
                </button>
              </>
            ) : (
              <button
                onClick={async () => {
                  const phone = otherParticipant?.userId?.phone;
                  if (!phone) {
                    alert('Không tìm thấy số điện thoại của người dùng này.');
                    return;
                  }
                  try {
                    const res = await fetch(`${API_URL}/friend-requests/send`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ phone }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert('Đã gửi lời mời kết bạn thành công!');
                      onFriendStatusChange();
                    } else {
                      alert(data.message || 'Không thể gửi lời mời kết bạn.');
                    }
                  } catch (err) {
                    alert('Lỗi khi gửi kết bạn.');
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 hover:text-white text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Kết bạn
              </button>
            )}

            {!hasSentRequest && (
              <button
                onClick={async () => {
                  if (!otherUserId) return;
                  if (!confirm('Bạn có chắc chắn muốn chặn người dùng này không?')) return;
                  try {
                    const res = await fetch(`${API_URL}/blocked-users`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ blockedUserId: otherUserId }),
                    });
                    if (res.ok) {
                      alert('Đã chặn người dùng thành công!');
                      onFriendStatusChange();
                    } else {
                      const data = await res.json();
                      alert(data.message || 'Thao tác chặn thất bại.');
                    }
                  } catch (err) {
                    alert('Lỗi khi chặn người dùng.');
                  }
                }}
                className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-400 font-bold rounded-lg transition-colors cursor-pointer"
              >
                Chặn
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Pinned Messages Bar */}
      {pinnedMessages && pinnedMessages.length > 0 && (
        <div className="bg-slate-900/90 border-b border-slate-850 flex flex-col shrink-0">
          {/* Main Pin Strip (Displays most recent pin) */}
          <div
            onClick={() => setPinnedExpanded(!pinnedExpanded)}
            className="px-6 py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <IconPin size={14} className="text-blue-400 rotate-45 shrink-0" />
              <span className="font-semibold text-slate-400 shrink-0">Pinned Message:</span>
              <span className="text-slate-350 truncate">
                <span className="font-semibold text-slate-200">
                  {pinnedMessages[0].senderId?.displayName || pinnedMessages[0].senderId?.username || 'User'}:
                </span>{' '}
                {pinnedMessages[0].isRevoked ? 'Message was revoked' : pinnedMessages[0].content || '[Media file]'}
              </span>
              {pinnedMessages.length > 1 && (
                <span className="bg-slate-800 text-blue-400 font-bold px-1.5 py-0.5 rounded-full text-[10px] shrink-0 border border-slate-700/50">
                  +{pinnedMessages.length - 1} more
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePinMessage(pinnedMessages[0]._id, false);
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Unpin message"
              >
                <IconX size={13} />
              </button>
              <span className="text-slate-500">
                {pinnedExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </span>
            </div>
          </div>

          {/* Expanded List of all pins */}
          {pinnedExpanded && (
            <div className="px-6 py-1 bg-slate-950/60 border-t border-slate-850/80 divide-y divide-slate-850/50 max-h-40 overflow-y-auto animate-in slide-in-from-top-2 duration-150">
              {pinnedMessages.map((pm) => {
                const name = pm.senderId?.displayName || pm.senderId?.username || 'User';
                return (
                  <div key={pm._id} className="py-2 flex items-center justify-between gap-4 text-xs">
                    <div
                      onClick={() => {
                        const el = document.getElementById(`message-${pm._id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('bg-blue-600/20');
                          setTimeout(() => el.classList.remove('bg-blue-600/20'), 1500);
                        }
                      }}
                      className="flex-1 cursor-pointer hover:text-slate-100 truncate text-slate-350"
                      title="Click to locate this message"
                    >
                      <span className="font-semibold text-slate-350 mr-1">{name}:</span>
                      <span>{pm.isRevoked ? 'Message was revoked' : pm.content || '[Media file]'}</span>
                    </div>
                    <button
                      onClick={() => onTogglePinMessage(pm._id, false)}
                      className="text-slate-500 hover:text-rose-450 px-1 py-0.5 rounded transition-colors cursor-pointer shrink-0"
                      title="Unpin message"
                    >
                      Unpin
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Messages List Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Say hello to start the conversation!
          </div>
        ) : (
          messages.map((m) => {
            const isOwn = m.senderId?._id === (user._id || user.id) || m.senderId === (user._id || user.id);
            const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const senderName = m.senderId?.displayName || m.senderId?.username || 'User';

            return (
              <div
                key={m._id}
                id={`message-${m._id}`}
                onContextMenu={(e) => onContextMenu(e, m)}
                className={`flex gap-3 max-w-[75%] transition-all duration-300 rounded-xl p-1 ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'}`}
              >
                {/* Avatar (only for other senders, direct & groups) */}
                {!isOwn && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 mt-1">
                    {m.senderId?.avatar ? (
                      <img src={m.senderId.avatar} alt={senderName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{senderName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                )}

                {/* Message Content Bubble Container */}
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>

                  {/* Sender Name (only for other senders, direct & groups) */}
                  {!isOwn && (
                    <span className="text-[11px] text-slate-400 font-semibold mb-1 ml-1">{senderName}</span>
                  )}

                  {/* Bubble */}
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed border relative group ${m.isRevoked ? 'bg-slate-900 border-slate-800 text-slate-500 italic' : isOwn ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none' : 'bg-slate-800 border-slate-700/80 text-slate-200 rounded-tl-none'}`}>

                    {/* Small Pinned indicator on bubble */}
                    {m.isPinned && (
                      <div className="absolute -top-1.5 -right-1.5 bg-slate-900 border border-slate-750 p-0.5 rounded-full text-blue-400 rotate-45 shrink-0" title="Pinned message">
                        <IconPin size={10} />
                      </div>
                    )}

                    {/* Reply Reference Card Inside Bubble */}
                    {m.parentId && (
                      <div className={`p-2 rounded-lg text-xs mb-2 border shrink-0 max-w-full ${isOwn ? 'bg-blue-700/40 border-blue-600/40 text-blue-100' : 'bg-slate-900/60 border-slate-800/80 text-slate-400'}`}>
                        <p className="font-bold mb-0.5 truncate">
                          {m.parentId.senderId?._id === (user._id || user.id) ? (lang === 'vi' ? 'Bạn' : 'You') : m.parentId.senderId?.displayName || 'User'}
                        </p>
                        <p className="truncate">
                          {m.parentId.isRevoked ? (lang === 'vi' ? 'Tin nhắn đã thu hồi' : 'Message revoked') : m.parentId.content || '[File / Media]'}
                        </p>
                      </div>
                    )}

                    {/* Main Message Body */}
                    {m.isRevoked ? (
                      <span>{lang === 'vi' ? 'Tin nhắn đã thu hồi' : 'Message was revoked'}</span>
                    ) : (
                      <>
                        {m.type === 'text' && <span>{m.content}</span>}

                        {m.type === 'image' && m.attachments?.[0] && (
                          <div className="max-w-xs overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800 mt-1">
                            <img src={m.attachments[0]} alt="shared file" className="w-full h-auto max-h-60 object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(m.attachments[0])} />
                          </div>
                        )}

                        {m.type === 'audio' && m.attachments?.[0] && (
                          <div className="flex items-center gap-2 mt-1 py-1 px-2 rounded-lg bg-slate-950/40 border border-slate-800/50">
                            <IconMicrophone size={16} className="text-blue-400 shrink-0" />
                            <audio src={m.attachments[0]} controls className="h-8 max-w-xs outline-none" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Timestamp & Seen status */}
                  <div className="flex items-center gap-1.5 mt-1.5 px-1 select-none">
                    <span className="text-[10px] text-slate-500">{timeStr}</span>
                    {isOwn && !m.isRevoked && (
                      <span className="text-[9px] shrink-0 font-semibold tracking-wider uppercase">
                        {isSeen(m) ? (
                          <span className="text-blue-400" title={getSeenTooltip(m)}>{lang === 'vi' ? '• Đã xem' : '• Read'}</span>
                        ) : (
                          <span className="text-slate-500">{lang === 'vi' ? '• Đã gửi' : '• Sent'}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Reply Target Indicator Header */}
      {replyToMessage && (
        <div className="px-6 py-2 border-t border-slate-850 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="text-blue-400 font-semibold shrink-0">{lang === 'vi' ? 'Đang trả lời:' : 'Replying to:'}</span>
            <span className="truncate italic">
              "{replyToMessage.content || (lang === 'vi' ? '[Tệp tin / Media]' : '[File / Media]')}"
            </span>
          </div>
          <button
            onClick={onClearReply}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 cursor-pointer"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* 5. Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center gap-3 shrink-0">

        {/* Attachment Upload Button */}
        <label className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-800 cursor-pointer transition-colors shrink-0">
          <input
            type="file"
            className="hidden"
            disabled={uploading || recording}
            onChange={handleFileUpload}
            accept="image/*,audio/*"
          />
          <IconPaperclip size={20} />
        </label>

        {/* Text Area Input */}
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          disabled={uploading || recording}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
          placeholder={
            uploading 
              ? (lang === 'vi' ? 'Đang tải tệp đính kèm lên...' : 'Uploading attachment...') 
              : recording 
                ? (lang === 'vi' ? 'Đang ghi âm thoại...' : 'Recording voice...') 
                : (lang === 'vi' ? 'Nhập tin nhắn...' : 'Type a message...')
          }
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
        />

        {/* Voice Recorder Indicator & Control Button */}
        {recording ? (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl shrink-0">
            <IconCircleDot size={16} className="text-rose-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-rose-400">{formatTime(recordTime)}</span>
            <button
              onClick={stopRecording}
              className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer"
              title={lang === 'vi' ? 'Dừng và Gửi' : 'Stop and Send'}
            >
              <IconX size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            disabled={uploading}
            className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-blue-400 cursor-pointer transition-colors shrink-0"
            title={lang === 'vi' ? 'Ghi âm thoại' : 'Record voice'}
          >
            <IconMicrophone size={20} />
          </button>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={uploading || !inputText.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white cursor-pointer transition-all shrink-0 active:scale-95"
        >
          <IconSend size={20} />
        </button>

      </div>

    </div>
  );
};
