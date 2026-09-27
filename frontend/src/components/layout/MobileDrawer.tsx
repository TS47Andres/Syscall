import React from 'react';
import { SyscallLogo } from '../Logo';
import { IconClose } from '../Icons';
import { Sidebar, type FolderId } from './Sidebar';
import type { User, Email } from '../../types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolder: FolderId;
  onSelectFolder: (folder: FolderId) => void;
  emails: Email[];
  starredIds: Set<string>;
  trashIds: Set<string>;
  currentUser: User;
  onOpenProfile?: () => void;
  onSignOut?: () => void;
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
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <aside style={styles.drawer} className="animate-slide-left">
        <div style={styles.topHeader}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => {
              onSelectFolder('inbox');
              onClose();
            }}
            title="Syscall"
          >
            <SyscallLogo size={32} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#1F1F1F', letterSpacing: '-0.3px' }}>
              Syscall
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close menu" aria-label="Close menu">
            <IconClose size={20} color="#444746" />
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
    width: '285px',
    maxWidth: '85vw',
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    padding: '14px 12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
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
};
