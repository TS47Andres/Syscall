import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Email } from '../../types';
import type { TabCategory } from './CategoryTabs';
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
  IconCheck,
  IconMinus,
  IconMailRead,
  IconMailUnread,
  IconMoreVertical,
  IconClose,
} from '../Icons';
import { useMail } from '../../context/MailContext';
import { t } from '../../utils/i18n';

interface EmailListProps {
  emails: Email[];
  folder: string;
  categoryTab: TabCategory;
  onSelectCategoryTab: (tab: TabCategory) => void;
  selectedEmailId: string | null;
  starredIds: Set<string>;
  checkedEmailIds: Set<string>;
  onSelectEmail: (email: Email) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onToggleCheck: (id: string, e: React.MouseEvent) => void;
  onToggleSelectAll: () => void;
  onBatchRead: (read: boolean, overrideIds?: string[]) => void;
  onBatchStar: (star: boolean, overrideIds?: string[]) => void;
  onBatchTrash: () => void;
  onBatchSpam: (spam: boolean) => void;
  onBatchLabel?: (action: 'important' | 'inbox' | 'spam' | 'trash') => void;
  onClearSelection: () => void;
  onSingleToggleRead?: (id: string, e: React.MouseEvent) => void;
  onSingleDelete?: (id: string, e: React.MouseEvent) => void;
  onSingleSpam?: (id: string, e: React.MouseEvent) => void;
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
  checkedEmailIds,
  onSelectEmail,
  onToggleStar,
  onToggleCheck,
  onToggleSelectAll,
  onBatchRead,
  onBatchStar,
  onBatchTrash,
  onBatchSpam,
  onBatchLabel,
  onClearSelection,
  onSingleToggleRead,
  onSingleDelete,
  onSingleSpam,
  onEmptyBin,
  onRefresh,
  refreshing,
  isMobile,
  hasSelectedEmail,
}) => {
  const { currentUser } = useMail();
  const lang = currentUser?.language || 'en';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const checkedCount = checkedEmailIds.size;
  const allSelected = emails.length > 0 && emails.every((e) => checkedEmailIds.has(e.publicId));

  // Keep the menu aligned with its trigger and inside the visible viewport.
  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 0;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));
    const below = rect.bottom + 6;
    const top = menuHeight > 0 && below + menuHeight > window.innerHeight - 12
      ? Math.max(12, rect.top - menuHeight - 6)
      : below;
    setMenuCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!isMenuOpen) return;
    updateMenuPosition();
    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isMenuOpen, checkedCount, updateMenuPosition]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMenuOpen((v) => !v);
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setIsMenuOpen(false);
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', onDocClick);
      document.addEventListener('touchstart', onDocClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [isMenuOpen]);

  const getFolderTitle = () => {
    switch (folder) {
      case 'bin':
      case 'trash':
        return t('bin', lang);
      case 'spam':
        return t('spam', lang);
      case 'sent':
        return t('sent', lang);
      case 'starred':
        return t('starred', lang);
      case 'allmail':
        return t('allmail', lang);
      case 'snoozed':
        return t('snoozed', lang);
      case 'important':
        return t('important', lang);
      case 'scheduled':
        return t('scheduled', lang);
      case 'drafts':
        return t('drafts', lang);
      case 'purchases':
        return t('purchases', lang);
      case 'social':
        return t('social', lang);
      case 'promotions':
        return t('promotions', lang);
      case 'updates':
        return t('updates', lang);
      default:
        return t('inbox', lang);
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
      {/* Single Unified Header Row: Checkbox, 3-dots, and Category Chips / Folder title */}
      <div className="gmail-cat-tabs-row no-scrollbar" style={{ ...styles.unifiedHeaderRow, display: checkedCount > 0 && isMobile ? 'none' : 'flex' }}>
        {/* Master Select All Checkbox (DESKTOP ONLY - hidden on mobile responsive) */}
        {!isMobile && (
          <button
            type="button"
            className="gmail-toolbar-icon-btn hide-on-mobile"
            onClick={onToggleSelectAll}
            title={allSelected ? t('deselect_all', lang) : t('select_all', lang)}
            aria-label={allSelected ? t('deselect_all', lang) : t('select_all', lang)}
            style={styles.checkboxBtn}
          >
            <div
              style={{
                ...styles.checkboxBox,
                backgroundColor: checkedCount > 0 ? '#0B57D0' : 'transparent',
                borderColor: checkedCount > 0 ? '#0B57D0' : '#747775',
              }}
            >
              {checkedCount > 0 && (
                allSelected ? (
                  <IconCheck size={12} color="#FFFFFF" />
                ) : (
                  <IconMinus size={12} color="#FFFFFF" />
                )
              )}
            </div>
          </button>
        )}

        {/* Selection Count Badge when emails are selected */}
        {checkedCount > 0 && (
          <span style={styles.selectionCountBadge}>
            {checkedCount} {t('selected_count', lang)}
          </span>
        )}

        {/* Three-Dot Menu Button with all options */}
        <button
          ref={buttonRef}
          type="button"
          className="gmail-toolbar-icon-btn"
          onClick={handleToggleMenu}
          title="Options"
          aria-label="Options"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          style={styles.threeDotBtn}
        >
          <IconMoreVertical size={18} color="#444746" />
        </button>

        {/* Render the menu outside the scrolling toolbar so it stays fully visible. */}
        {isMenuOpen && createPortal(
          <div
            ref={menuRef}
            className="gmail-dropdown-menu"
            role="menu"
            style={{
              ...styles.dropdownMenu,
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
            }}
          >
            {checkedCount > 0 ? (
              <>
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onBatchRead(true);
                  }}
                >
                  <IconMailRead size={16} color="#444746" />
                  <span>{t('mark_as_read', lang)}</span>
                </button>
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onBatchRead(false);
                  }}
                >
                  <IconMailUnread size={16} color="#444746" />
                  <span>{t('mark_as_unread', lang)}</span>
                </button>
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onBatchStar(true);
                  }}
                >
                  <IconStar size={16} color="#E37400" />
                  <span>{t('star_selected', lang)}</span>
                </button>
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onBatchLabel?.('important');
                  }}
                >
                  <IconImportant size={16} color="#0B57D0" />
                  <span>{t('mark_important', lang)}</span>
                </button>
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onBatchTrash();
                  }}
                >
                  <IconTrash size={16} color="#BA1A1A" />
                  <span>{t('delete_selected', lang)}</span>
                </button>
                {folder !== 'spam' && folder !== 'bin' && (
                  <button
                    type="button"
                    style={styles.dropdownItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onBatchSpam(true);
                    }}
                  >
                    <IconSpam size={16} color="#BA1A1A" />
                    <span>{t('report_spam', lang)}</span>
                  </button>
                )}
                <div style={styles.dropdownDivider} />
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onClearSelection();
                  }}
                >
                  <IconClose size={16} color="#747775" />
                  <span>{t('deselect_all', lang)}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onToggleSelectAll();
                  }}
                >
                  <IconCheck size={16} color="#444746" />
                  <span>{t('select_all', lang)}</span>
                </button>
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    const allIds = emails.map((m) => m.publicId);
                    if (allIds.length > 0) onBatchRead(true, allIds);
                  }}
                >
                  <IconMailRead size={16} color="#444746" />
                  <span>{t('mark_as_read', lang)} (all)</span>
                </button>
                <button
                  type="button"
                  style={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    const allIds = emails.map((m) => m.publicId);
                    if (allIds.length > 0) onBatchRead(false, allIds);
                  }}
                >
                  <IconMailUnread size={16} color="#444746" />
                  <span>{t('mark_as_unread', lang)} (all)</span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}

        {/* Vertical Divider */}
        <div style={styles.toolbarDivider} />

        {/* In Inbox: Category Tabs right on the same line */}
        {folder === 'inbox' ? (
          <div style={styles.categoryChipsGroup}>
            <button
              type="button"
              className={`gmail-cat-chip ${categoryTab === 'all' ? 'active' : ''}`}
              onClick={() => onSelectCategoryTab('all')}
            >
              <IconInbox size={15} />
              <span>{t('primary', lang)}</span>
            </button>
            <button
              type="button"
              className={`gmail-cat-chip ${categoryTab === 'promotions' ? 'active' : ''}`}
              onClick={() => onSelectCategoryTab('promotions')}
            >
              <IconPromotions size={15} />
              <span>{t('promotions', lang)}</span>
            </button>
            <button
              type="button"
              className={`gmail-cat-chip ${categoryTab === 'social' ? 'active' : ''}`}
              onClick={() => onSelectCategoryTab('social')}
            >
              <IconSocial size={15} />
              <span>{t('social', lang)}</span>
            </button>
            <button
              type="button"
              className={`gmail-cat-chip ${categoryTab === 'updates' ? 'active' : ''}`}
              onClick={() => onSelectCategoryTab('updates')}
            >
              <IconUpdates size={15} />
              <span>{t('updates', lang)}</span>
            </button>
          </div>
        ) : (
          /* Non-inbox folders: Title and empty bin button */
          <div style={styles.folderTitleGroup}>
            <strong style={styles.folderHeading}>{getFolderTitle()}</strong>
            {(folder === 'bin' || folder === 'trash') && emails.length > 0 && onEmptyBin && (
              <button type="button" style={styles.emptyBinBtn} onClick={onEmptyBin}>
                Empty Bin now
              </button>
            )}
          </div>
        )}

        {/* Refresh Button at the right end */}
        {onRefresh && (
          <button
            type="button"
            style={styles.refreshBtn}
            onClick={onRefresh}
            title={t('refresh_mail', lang)}
            aria-label={t('refresh_mail', lang)}
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
              isChecked={checkedEmailIds.has(email.publicId)}
              isMobile={isMobile}
              hasSelectionActive={checkedCount > 0}
              onSelect={onSelectEmail}
              onToggleStar={onToggleStar}
              onToggleCheck={onToggleCheck}
              onToggleRead={onSingleToggleRead}
              onDelete={onSingleDelete}
              onToggleSpam={onSingleSpam}
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
  unifiedHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #F1F3F4',
    flexShrink: 0,
    userSelect: 'none',
    minHeight: '48px',
  },
  checkboxBtn: {
    background: 'none',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    outline: 'none',
  },
  checkboxBox: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    border: '1.8px solid #747775',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  selectionCountBadge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#0B57D0',
    backgroundColor: '#D3E3FD',
    padding: '3px 8px',
    borderRadius: '12px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  threeDotBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
  },
  toolbarDivider: {
    width: '1px',
    height: '20px',
    backgroundColor: '#E0E2EC',
    margin: '0 2px',
    flexShrink: 0,
  },
  categoryChipsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    overflowX: 'auto',
  },
  folderTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  folderHeading: {
    fontSize: '15px',
    color: '#1F1F1F',
    fontWeight: 600,
  },
  dropdownMenu: {
    position: 'fixed',
    zIndex: 99999,
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.18), 0 1px 4px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E0E2EC',
    minWidth: '210px',
    padding: '6px 0',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 24px)',
    overflowY: 'auto',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 14px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#1F1F1F',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background-color 0.15s ease',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#F1F3F4',
    margin: '4px 0',
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
    flexShrink: 0,
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
