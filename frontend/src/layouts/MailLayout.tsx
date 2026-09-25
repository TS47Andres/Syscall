/**
 * File: MailLayout.tsx
 * Role: Composes the authenticated shell and wires compose actions to the API context.
 * Service: Frontend.
 */
import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useMail } from '../context/MailContext';
import { Header } from '../components/layout/Header';
import { Sidebar, type FolderId } from '../components/layout/Sidebar';
import { MobileDrawer } from '../components/layout/MobileDrawer';
import { FloatingComposeButton } from '../components/compose/FloatingComposeButton';
import { ComposeModal } from '../components/ComposeModal';

export const MailLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    emails,
    starredIds,
    trashIds,
    searchQuery,
    setSearchQuery,
    isDrawerOpen,
    setIsDrawerOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isComposeOpen,
    setIsComposeOpen,
    composePrefill,
    setComposePrefill,
    handleSendMail,
    handleSaveDraft,
    handleScheduleMail,
    handleSignOut,
  } = useMail();

  // Determine current active folder from path /mail/:folder
  const pathParts = location.pathname.split('/').filter(Boolean);
  let currentFolder: FolderId = 'inbox';
  if (pathParts[0] === 'mail' && pathParts[1]) {
    currentFolder = pathParts[1] as FolderId;
  }

  const isProfilePageOpen = location.pathname.startsWith('/profile');

  const handleSelectFolder = (folder: FolderId) => {
    navigate(`/mail/${folder}`);
  };

  const handleProfileClick = () => {
    if (isProfilePageOpen) {
      navigate('/mail/inbox');
    } else {
      navigate('/profile');
    }
  };

  return (
    <div style={styles.appContainer} className="gmail-layout-container">
      {/* 1. TOP HEADER */}
      <Header
        currentUser={currentUser}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onProfileClick={handleProfileClick}
        isProfilePageOpen={isProfilePageOpen}
      />

      {/* 2. BODY WORKSPACE */}
      <div style={styles.mainContentArea}>
        {/* Desktop Collapsible Left Sidebar */}
        <div className="desktop-only" style={{ display: 'flex', height: '100%' }}>
          <Sidebar
            currentFolder={currentFolder}
            onSelectFolder={handleSelectFolder}
            emails={emails}
            starredIds={starredIds}
            trashIds={trashIds}
            userPhone={currentUser.phone}
            isCollapsed={isSidebarCollapsed}
          />
        </div>

        {/* Mobile Slide-in Drawer */}
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentFolder={currentFolder}
          onSelectFolder={handleSelectFolder}
          emails={emails}
          starredIds={starredIds}
          trashIds={trashIds}
          currentUser={currentUser}
          onOpenProfile={() => {
            navigate('/profile');
            setIsDrawerOpen(false);
          }}
          onSignOut={handleSignOut}
        />

        {/* Main Content Router Outlet */}
        <Outlet />
      </div>

      {/* 3. MOVABLE FLOATING ACTION BUTTON */}
      <FloatingComposeButton onOpenCompose={() => setIsComposeOpen(true)} />

      {/* 4. MODALS */}
      {isComposeOpen && (
        <ComposeModal
          onClose={() => {
            setIsComposeOpen(false);
            setComposePrefill(null);
          }}
          onSent={(mail) => handleSendMail(mail.to, mail.subject, mail.textBody, mail.attachments, mail.replyToId, mail.draftId)}
          onSaveDraft={(draft) => handleSaveDraft(draft.to, draft.subject, draft.textBody, draft.attachments, draft.draftId)}
          onSchedule={(message) => handleScheduleMail(message.to, message.subject, message.textBody, message.scheduledAt, message.attachments)}
          initialTo={composePrefill?.to || ''}
          initialSubject={composePrefill?.subject || ''}
          initialBody={composePrefill?.body || ''}
          replyToId={composePrefill?.replyToId}
          draftId={composePrefill?.draftId}
          initialAttachments={composePrefill?.draftAttachments}
          mailDomain={currentUser.emailAddress.split('@')[1] || 'niti'}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#F6F8FC',
    overflow: 'hidden',
    position: 'relative',
  },
  mainContentArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
};
