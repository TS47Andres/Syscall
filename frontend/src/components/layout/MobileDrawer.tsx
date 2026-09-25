import React from 'react';
import { SyscallLogo } from '../Logo';
import { IconClose } from '../Icons';
import { Sidebar, type FolderId } from './Sidebar';
import type { User, Email } from '../../types';
import { getInitials } from '../../types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolder: FolderId;
  onSelectFolder: (folder: FolderId) => void;
  emails: Email[];
  starredIds: Set<string>;
  trashIds: Set<string>;
  currentUser: User;
  onOpenProfile: () => void;
  onSignOut: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentFolder,
  onSelectFolder,
  emails,
  starredIds,
  trashIds,
  currentUser,
  onOpenProfile,
  onSignOut,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <aside style={styles.drawer} className="animate-slide-left">
        <div style={styles.topHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SyscallLogo size={28} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#1F1F1F' }}>
              Syscall Mail
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <IconClose size={18} color="#444746" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }} className="no-scrollbar">
          <Sidebar
            currentFolder={currentFolder}
            onSelectFolder={(f) => {
              onSelectFolder(f);
              onClose();
            }}
            emails={emails}
            starredIds={starredIds}
            trashIds={trashIds}
            userPhone={currentUser.phone}
            isCollapsed={false}
          />
        </div>

        {/* User Card */}
        <div
          style={styles.bottomCard}
          onClick={() => {
            onOpenProfile();
            onClose();
          }}
          title="View Syscall Account & Profile"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={styles.userAvatar}>
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                getInitials(currentUser.name)
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={styles.userName}>
                {currentUser.name || currentUser.emailAddress}
              </span>
              <span style={{ fontSize: 11.5, color: '#747775' }}>
                +91 {currentUser.phone} • Profile →
              </span>
            </div>
          </div>
          <button
            style={styles.signOutBtn}
            onClick={(e) => {
              e.stopPropagation();
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 998,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '280px',
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    boxShadow: 'var(--shadow-dropdown)',
  },
  topHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 4px 16px',
    borderBottom: '1px solid #F1F3F4',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  },
  bottomCard: {
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#EDF2FA',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: 'auto',
    cursor: 'pointer',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1F1F1F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signOutBtn: {
    fontSize: '12px',
    color: '#DC2626',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    padding: '2px 0',
    background: 'none',
    border: 'none',
  },
};
