import React from 'react';
import type { Email } from '../../types';
import { CategoryTabs, type TabCategory } from './CategoryTabs';
import { EmailRow } from './EmailRow';
import {
  IconTrash,
  IconAllMail,
  IconSpam,
  IconStar,
  IconSnoozed,
  IconImportant,
  IconSent,
  IconScheduled,
  IconDrafts,
  IconPurchases,
  IconSocial,
  IconPromotions,
  IconUpdates,
  IconInbox,
  IconSync,
} from '../Icons';

interface EmailListProps {
  emails: Email[];
  folder: string;
  categoryTab: TabCategory;
  onSelectCategoryTab: (tab: TabCategory) => void;
  selectedEmailId: string | null;
  starredIds: Set<string>;
  onSelectEmail: (email: Email) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onEmptyBin?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  isMobile?: boolean;
  hasSelectedEmail?: boolean;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  folder,
  categoryTab,
  onSelectCategoryTab,
  selectedEmailId,
  starredIds,
  onSelectEmail,
  onToggleStar,
  onEmptyBin,
  onRefresh,
  refreshing,
  isMobile,
  hasSelectedEmail,
}) => {
  const getFolderTitle = () => {
    switch (folder) {
      case 'bin':
      case 'trash':
        return 'Bin';
      case 'spam':
        return 'Spam';
      case 'sent':
        return 'Sent';
      case 'starred':
        return 'Starred';
      case 'allmail':
        return 'All Mail';
      case 'snoozed':
        return 'Snoozed';
      case 'important':
        return 'Important';
      case 'scheduled':
        return 'Scheduled';
      case 'drafts':
        return 'Drafts';
      case 'purchases':
        return 'Purchases';
      case 'social':
        return 'Social';
      case 'promotions':
        return 'Promotions';
      case 'updates':
        return 'Updates';
      default:
        return 'Inbox';
    }
  };

  const getEmptyIcon = () => {
    switch (folder) {
      case 'bin':
      case 'trash':
        return <IconTrash size={48} color="#BDC1C6" />;
      case 'spam':
        return <IconSpam size={48} color="#BDC1C6" />;
      case 'sent':
        return <IconSent size={48} color="#BDC1C6" />;
      case 'starred':
        return <IconStar size={48} color="#BDC1C6" />;
      case 'snoozed':
        return <IconSnoozed size={48} color="#BDC1C6" />;
      case 'important':
        return <IconImportant size={48} color="#BDC1C6" />;
      case 'scheduled':
        return <IconScheduled size={48} color="#BDC1C6" />;
      case 'drafts':
        return <IconDrafts size={48} color="#BDC1C6" />;
      case 'purchases':
        return <IconPurchases size={48} color="#BDC1C6" />;
      case 'social':
        return <IconSocial size={48} color="#BDC1C6" />;
      case 'promotions':
        return <IconPromotions size={48} color="#BDC1C6" />;
      case 'updates':
        return <IconUpdates size={48} color="#BDC1C6" />;
      case 'allmail':
        return <IconAllMail size={48} color="#BDC1C6" />;
      default:
        return <IconInbox size={48} color="#BDC1C6" />;
    }
  };

  return (
    <section
      className="gmail-email-list-wrapper"
      style={{
        ...styles.container,
        display: hasSelectedEmail && isMobile ? 'none' : 'flex',
      }}
    >
      {/* Category Tabs in Inbox or Folder Title */}
      {folder === 'inbox' ? (
        <CategoryTabs
          activeTab={categoryTab}
          onSelectTab={onSelectCategoryTab}
        />
      ) : (
        <div style={styles.folderHeader}>
          <strong style={{ fontSize: 16, color: '#1F1F1F' }}>
            {getFolderTitle()}
          </strong>

          {(folder === 'bin' || folder === 'trash') && emails.length > 0 && onEmptyBin && (
            <button style={styles.emptyBinBtn} onClick={onEmptyBin}>
              Empty Bin now
            </button>
          )}

          {onRefresh && (
            <button
              style={styles.refreshBtn}
              onClick={onRefresh}
              title="Refresh mail"
            >
              <span
                style={{
                  display: 'inline-flex',
                  transform: refreshing ? 'rotate(360deg)' : 'none',
                  transition: 'transform 0.5s ease',
                }}
              >
                <IconSync size={16} color="#444746" />
              </span>
            </button>
          )}
        </div>
      )}

      {/* Email Rows List */}
      <div style={styles.rowsScroll} className="gmail-email-scroll no-scrollbar">
        {emails.length === 0 ? (
          <div style={styles.emptyPlaceholder}>
            {getEmptyIcon()}
            <p style={{ marginTop: 16, fontSize: 15, fontWeight: 600, color: '#444746' }}>
              No messages in {getFolderTitle().toLowerCase()}
            </p>
            <span style={{ fontSize: 13, color: '#747775', marginTop: 4 }}>
              Messages that arrive here will appear cleanly in this view.
            </span>
          </div>
        ) : (
          emails.map((email) => (
            <EmailRow
              key={email.publicId}
              email={email}
              folder={folder}
              isSelected={email.publicId === selectedEmailId}
              isStarred={starredIds.has(email.publicId)}
              onSelect={onSelectEmail}
              onToggleStar={onToggleStar}
            />
          ))
        )}
      </div>
    </section>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    margin: '0 16px 16px 0',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(60,64,67,0.06)',
    minWidth: 0,
  },
  folderHeader: {
    height: '48px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #F1F3F4',
    gap: '12px',
    flexShrink: 0,
  },
  emptyBinBtn: {
    fontSize: '12.5px',
    color: '#BA1A1A',
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: '2px 6px',
    backgroundColor: 'transparent',
    border: 'none',
  },
  refreshBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    marginLeft: 'auto',
  },
  rowsScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  emptyPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
};
