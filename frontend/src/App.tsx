import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ContextMenu } from './components/ContextMenu';
import { ShareModal } from './components/ShareModal';
import { ProfileModal } from './components/ProfileModal';
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
  } = useChatManager();

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-955 bg-slate-950 text-slate-100 font-sans select-none">

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
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-955 bg-slate-950">
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
