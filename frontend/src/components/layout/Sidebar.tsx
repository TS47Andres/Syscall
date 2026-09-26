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

import { useMail } from '../../context/MailContext';
import { t } from '../../utils/i18n';

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
  const { currentUser } = useMail();
  const lang = currentUser?.language || 'en';

  const isPromoMail = (mail: Email) => {
    const text = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      text.includes('promo') ||
      text.includes('offer') ||
      text.includes('discount') ||
      text.includes('deal') ||
      text.includes('sale') ||
      text.includes('coupon') ||
      text.includes('cashback') ||
      text.includes('shopping') ||
      text.includes('store')
    );
  };

  const isSocialMail = (mail: Email) => {
    const text = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      text.includes('social') ||
      text.includes('connect') ||
      text.includes('network') ||
      text.includes('linkedin') ||
      text.includes('twitter') ||
      text.includes('instagram') ||
      text.includes('facebook') ||
      text.includes('youtube') ||
      text.includes('community') ||
      text.includes('invite')
    );
  };

  const isPurchaseMail = (mail: Email) => {
    const text = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      text.includes('purchase') ||
      text.includes('order') ||
      text.includes('invoice') ||
      text.includes('receipt') ||
      text.includes('bill') ||
      text.includes('payment') ||
      text.includes('transaction') ||
      text.includes('paid')
    );
  };

  const isImportantMail = (mail: Email) => {
    const text = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      starredIds.has(mail.publicId) ||
      text.includes('important') ||
      text.includes('urgent') ||
      text.includes('otp') ||
      text.includes('security') ||
      text.includes('telecom') ||
      text.includes('alert') ||
      text.includes('welcome')
    );
  };

  const isUpdateMail = (mail: Email) => {
    const text = (mail.subject + ' ' + mail.textBody).toLowerCase();
    return (
      text.includes('update') ||
      text.includes('notification') ||
      text.includes('confirm') ||
      text.includes('receipt') ||
      text.includes('bill') ||
      text.includes('statement') ||
      text.includes('alert') ||
      text.includes('security') ||
      text.includes('verify') ||
      text.includes('welcome') ||
      text.includes('telecom') ||
      text.includes('account')
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
      label: t('inbox', lang),
      icon: (act) => <IconInbox size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !m.isSpam && !m.readAt && !trashIds.has(m.publicId)).length,
    },
    {
      id: 'sent',
      label: t('sent', lang),
      icon: (act) => <IconSent size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => m.senderAddress.includes(userPhone) && !trashIds.has(m.publicId)).length,
    },
    {
      id: 'allmail',
      label: t('allmail', lang),
      icon: (act) => <IconAllMail size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && !m.isSpam).length,
    },
    {
      id: 'starred',
      label: t('starred', lang),
      icon: (act) => <IconStar size={18} filled={act} color={act ? '#B06000' : '#444746'} />,
      count: emails.filter((m) => starredIds.has(m.publicId) && !trashIds.has(m.publicId)).length,
    },
    {
      id: 'snoozed',
      label: t('snoozed', lang),
      icon: (act) => <IconSnoozed size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: 0,
    },
    {
      id: 'important',
      label: t('important', lang),
      icon: (act) => <IconImportant size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isImportantMail(m) && !m.readAt).length,
    },
    {
      id: 'scheduled',
      label: t('scheduled', lang),
      icon: (act) => <IconScheduled size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((mail) => mail.deliveryStatus === 'scheduled').length,
    },
    {
      id: 'drafts',
      label: t('drafts', lang),
      icon: (act) => <IconDrafts size={18} color={act ? '#0B57D0' : '#444746'} />,
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
      label: t('promotions', lang),
      icon: (act) => <IconPromotions size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isPromoMail(m) && !m.readAt).length,
    },
    {
      id: 'social',
      label: t('social', lang),
      icon: (act) => <IconSocial size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isSocialMail(m) && !m.readAt).length,
    },
    {
      id: 'purchases',
      label: t('purchases', lang),
      icon: (act) => <IconPurchases size={18} color={act ? '#0B57D0' : '#444746'} />,
      count: emails.filter((m) => !trashIds.has(m.publicId) && isPurchaseMail(m) && !m.readAt).length,
    },
    {
      id: 'updates',
      label: t('updates', lang),
      icon: (act) => <IconUpdates size={18} color={act ? '#0B57D0' : '#444746'} />,
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
      label: t('spam', lang),
      icon: (act) => <IconSpam size={18} color={act ? '#BA1A1A' : '#444746'} />,
      count: emails.filter((m) => m.isSpam && !trashIds.has(m.publicId)).length,
    },
    {
      id: 'bin',
      label: t('bin', lang),
      icon: (act) => <IconTrash size={18} color={act ? '#BA1A1A' : '#444746'} />,
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
          height: '34px',
          minHeight: '34px',
          width: isCollapsed ? '46px' : '100%',
          borderRadius: isCollapsed ? '19px' : '0 17px 17px 0',
          margin: isCollapsed ? '0 auto 1px' : '0 0 1px 0',
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
              margin: isCollapsed ? '8px auto' : '8px 16px',
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
              margin: isCollapsed ? '8px auto' : '8px 16px',
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
