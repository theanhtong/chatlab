import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ContextMenu } from './components/ContextMenu';
import { ShareModal } from './components/ShareModal';
import { ProfileModal } from './components/ProfileModal';
import { AdminDashboard } from './components/AdminDashboard';
import { useChatManager } from './hooks/useChatManager';

function App() {
  const {
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
  } = useChatManager();

  if (!token || !user) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        toggleTheme={toggleTheme}
        lang={lang}
        toggleLang={toggleLang}
      />
    );
  }

  if (adminOpen) {
    return (
      <AdminDashboard
        token={token}
        onClose={() => setAdminOpen(false)}
        lang={lang}
        theme={theme}
        currentUser={user}
      />
    );
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
        onDeleteConversation={handleDeleteConversation}
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
        theme={theme}
        toggleTheme={toggleTheme}
        lang={lang}
        toggleLang={toggleLang}
        onOpenAdmin={() => setAdminOpen(true)}
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
          lang={lang}
          theme={theme}
          blockedByMe={blockedByMe}
          setBlockedByMe={setBlockedByMe}
          blockedByThem={blockedByThem}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-505 text-slate-500 bg-slate-950">
          <p className="text-sm font-medium text-slate-400">
            {lang === 'vi' 
              ? 'Chọn một cuộc trò chuyện hoặc kiểm tra danh bạ để bắt đầu nhắn tin' 
              : 'Select a conversation or check friends to start chatting'}
          </p>
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
          isBlocked={blockedByMe || blockedByThem}
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
          lang={lang}
        />
      )}

    </div>
  );
}

export default App;
