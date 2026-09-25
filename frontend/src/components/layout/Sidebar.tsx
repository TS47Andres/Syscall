/**
 * File: Sidebar.tsx
 * Role: Navigates real mailbox folders and summarizes loaded backend records.
 * Service: Frontend.
 */
import React from 'react';
import {
  IconInbox,
  IconSent,
  IconAllMail,
  IconStar,
  IconSnoozed,
  IconImportant,
  IconScheduled,
  IconDrafts,
  IconPromotions,
  IconSocial,
  IconPurchases,
  IconUpdates,
  IconSpam,
  IconTrash,
} from '../Icons';
import type { Email } from '../../types';

export type FolderId =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'important'
  | 'sent'
  | 'scheduled'
  | 'drafts'
  | 'allmail'
  | 'purchases'
  | 'social'
  | 'promotions'
  | 'updates'
  | 'spam'
  | 'bin'
  | 'trash';

interface SidebarProps {
  currentFolder: FolderId;
  onSelectFolder: (folder: FolderId) => void;
  emails: Email[];
  starredIds: Set<string>;
  trashIds: Set<string>;
  userPhone: string;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFolder,
  onSelectFolder,
  emails,
  starredIds,
  trashIds,
  userPhone,
  isCollapsed = false,
}) => {
  const isPromoMail = (mail: Email) => {
    const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      t.includes('promo') ||
      t.includes('offer') ||
      t.includes('discount') ||
      t.includes('deal') ||
      t.includes('sale') ||
      t.includes('coupon') ||
      t.includes('cashback') ||
      t.includes('shopping') ||
      t.includes('store')
    );
  };

  const isSocialMail = (mail: Email) => {
    const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      t.includes('social') ||
      t.includes('connect') ||
      t.includes('network') ||
      t.includes('linkedin') ||
      t.includes('twitter') ||
      t.includes('instagram') ||
      t.includes('facebook') ||
      t.includes('youtube') ||
      t.includes('community') ||
      t.includes('invite')
    );
  };

  const isPurchaseMail = (mail: Email) => {
    const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      t.includes('purchase') ||
      t.includes('order') ||
      t.includes('invoice') ||
      t.includes('receipt') ||
      t.includes('bill') ||
      t.includes('payment') ||
      t.includes('transaction') ||
      t.includes('paid')
    );
  };

  const isImportantMail = (mail: Email) => {
    const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      starredIds.has(mail.publicId) ||
      t.includes('important') ||
      t.includes('urgent') ||
      t.includes('otp') ||
      t.includes('security') ||
      t.includes('telecom') ||
      t.includes('alert') ||
      t.includes('welcome')
    );
  };

  const isUpdateMail = (mail: Email) => {
    const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      t.includes('update') ||
      t.includes('notification') ||
      t.includes('confirm') ||
      t.includes('receipt') ||
      t.includes('bill') ||
      t.includes('statement') ||
      t.includes('alert') ||
      t.includes('security') ||
      t.includes('verify') ||
      t.includes('welcome') ||
      t.includes('telecom') ||
      t.includes('account')
    );
  };

  const mainSection: Array<{
    id: FolderId;
    label: string;
    icon: (active: boolean) => React.ReactNode;
    count?: number;
  }> = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: (act) => <IconInbox size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !m.isSpam && !m.readAt && !trashIds.has(m.publicId)).length,
    },
    {
      id: 'sent',
      label: 'Sent',
      icon: (act) => <IconSent size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => m.senderAddress.includes(userPhone) && !trashIds.has(m.publicId)).length,
    },
    {
      id: 'allmail',
      label: 'All Mail',
      icon: (act) => <IconAllMail size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && !m.isSpam).length,
    },
    {
      id: 'starred',
      label: 'Starred',
      icon: (act) => <IconStar size={isCollapsed ? 20 : 18} filled={act} color={act ? '#B06000' : '#444746'} />,
      count: emails.filter((m) => starredIds.has(m.publicId) && !trashIds.has(m.publicId)).length,
    },
    {
      id: 'snoozed',
      label: 'Snoozed',
      icon: (act) => <IconSnoozed size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: 0,
    },
    {
      id: 'important',
      label: 'Important',
      icon: (act) => <IconImportant size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isImportantMail(m) && !m.readAt).length,
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      icon: (act) => <IconScheduled size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((mail) => mail.deliveryStatus === 'scheduled').length,
    },
    {
      id: 'drafts',
      label: 'Drafts',
      icon: (act) => <IconDrafts size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((mail) => mail.isDraft).length,
    },
  ];

  const categorySection: Array<{
    id: FolderId;
    label: string;
    icon: (active: boolean) => React.ReactNode;
    count?: number;
  }> = [
    {
      id: 'promotions',
      label: 'Promotions',
      icon: (act) => <IconPromotions size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isPromoMail(m) && !m.readAt).length,
    },
    {
      id: 'social',
      label: 'Social',
      icon: (act) => <IconSocial size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isSocialMail(m) && !m.readAt).length,
    },
    {
      id: 'purchases',
      label: 'Purchases',
      icon: (act) => <IconPurchases size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isPurchaseMail(m) && !m.readAt).length,
    },
    {
      id: 'updates',
      label: 'Updates',
      icon: (act) => <IconUpdates size={isCollapsed ? 20 : 18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isUpdateMail(m) && !m.readAt).length,
    },
  ];

  const cleanupSection: Array<{
    id: FolderId;
    label: string;
    icon: (active: boolean) => React.ReactNode;
    count?: number;
  }> = [
    {
      id: 'spam',
      label: 'Spam',
      icon: (act) => <IconSpam size={isCollapsed ? 20 : 18} color={act ? '#BA1A1A' : '#444746'} />,
      count: emails.filter((m) => m.isSpam && !trashIds.has(m.publicId)).length,
    },
    {
      id: 'bin',
      label: 'Bin',
      icon: (act) => <IconTrash size={isCollapsed ? 20 : 18} color={act ? '#BA1A1A' : '#444746'} />,
      count: trashIds.size,
    },
  ];

  const renderFolderItem = (item: { id: FolderId; label: string; icon: (active: boolean) => React.ReactNode; count?: number }) => {
    const isActive = currentFolder === item.id || (item.id === 'bin' && currentFolder === 'trash');
    return (
      <button
        key={item.id}
        onClick={() => onSelectFolder(item.id)}
        className={`gmail-nav-folder-btn ${isActive ? 'active' : ''}`}
        title={item.label + (typeof item.count === 'number' && item.count > 0 ? ` (${item.count})` : '')}
        style={{
          ...styles.folderItemBtn,
          backgroundColor: isActive ? '#D3E3FD' : 'transparent',
          color: isActive ? '#041E49' : '#444746',
          fontWeight: isActive ? 700 : 500,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          padding: isCollapsed ? '0' : '0 16px 0 20px',
          height: isCollapsed ? '38px' : '34px',
          minHeight: isCollapsed ? '38px' : '34px',
          width: isCollapsed ? '46px' : '100%',
          borderRadius: isCollapsed ? '19px' : '0 17px 17px 0',
          margin: isCollapsed ? '0 auto 3px' : '0 0 1px 0',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {item.icon(isActive)}
          {isCollapsed && typeof item.count === 'number' && item.count > 0 && (
            <span style={styles.collapsedBadge}>{item.count}</span>
          )}
        </div>
        {!isCollapsed && (
          <>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5 }}>{item.label}</span>
            {typeof item.count === 'number' && item.count > 0 && (
              <span
                style={{
                  ...styles.unreadCountBadge,
                  backgroundColor: item.id === 'bin' || item.id === 'spam' ? '#BA1A1A' : '#0B57D0',
                }}
              >
                {item.count}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside
      style={{
        ...styles.desktopSidebar,
        width: isCollapsed ? '72px' : '256px',
        minWidth: isCollapsed ? '72px' : '256px',
        padding: isCollapsed ? '16px 8px' : '16px 12px 16px 0',
        alignItems: isCollapsed ? 'center' : 'stretch',
      }}
    >
      <nav style={styles.navList} className="gmail-sidebar-nav no-scrollbar">
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* Section 1: Main Mailbox */}
          {mainSection.map(renderFolderItem)}

          {/* Divider Line 1 */}
          <div
            style={{
              height: '1px',
              backgroundColor: '#E0E2EC',
              margin: isCollapsed ? '6px auto' : '8px 16px',
              width: isCollapsed ? '32px' : 'calc(100% - 32px)',
              flexShrink: 0,
            }}
          />

          {/* Section 2: Feeds & Categories */}
          {categorySection.map(renderFolderItem)}

          {/* Divider Line 2 */}
          <div
            style={{
              height: '1px',
              backgroundColor: '#E0E2EC',
              margin: isCollapsed ? '6px auto' : '8px 16px',
              width: isCollapsed ? '32px' : 'calc(100% - 32px)',
              flexShrink: 0,
            }}
          />

          {/* Section 3: Cleanup & Security */}
          {cleanupSection.map(renderFolderItem)}
        </div>
      </nav>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  desktopSidebar: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--gmail-bg)',
    boxSizing: 'border-box',
    overflow: 'hidden',
    transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    flexShrink: 0,
  },
  navList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: '2px',
  },
  folderItemBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s ease',
    boxSizing: 'border-box',
  },
  unreadCountBadge: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#FFFFFF',
    borderRadius: '10px',
    padding: '2px 8px',
    marginLeft: 'auto',
  },
  collapsedBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-8px',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontSize: '10.5px',
    fontWeight: 700,
    borderRadius: '10px',
    padding: '1px 5px',
    minWidth: '16px',
    textAlign: 'center',
    lineHeight: '14px',
  },
};
