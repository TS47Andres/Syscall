/**
 * File: MailPage.tsx
 * Role: Filters backend mailbox records and routes mail actions to the context.
 * Service: Frontend.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMail } from '../context/MailContext';
import type { Email } from '../types';
import { api } from '../api';
import { EmailList } from '../components/mail/EmailList';
import { ReadingPane } from '../components/mail/ReadingPane';
import {
  isPromoMail,
  isSocialMail,
  isPurchaseMail,
  isImportantMail,
  isUpdateMail,
} from '../utils/mailHelpers';

export const MailPage: React.FC = () => {
  const { folder: rawFolder, mailId } = useParams<{ folder?: string; mailId?: string }>();
  const navigate = useNavigate();
  const folder = rawFolder || 'inbox';

  const {
    currentUser,
    emails,
    starredIds,
    trashIds,
    searchQuery,
    searchFilters,
    categoryTab,
    setCategoryTab,
    refreshing,
    loadError,
    loadMail,
    handleMoveToBin,
    handleRestoreFromBin,
    handlePermanentDelete,
    handleEmptyBin,
    handleToggleStar,
    handleToggleSpam,
    handleMarkRead,
    handleBatchAction,
    handleCancelScheduled,
    handleRescheduleScheduled,
    setIsComposeOpen,
    setComposePrefill,
  } = useMail();

  const [checkedEmailIds, setCheckedEmailIds] = useState<Set<string>>(new Set());

  // Clear selection when navigating between folders or category tabs
  useEffect(() => {
    setCheckedEmailIds(new Set());
  }, [folder, categoryTab]);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtered emails based on folder, category tabs, and search query + advanced filters
  const filteredEmails = useMemo(() => {
    const activeFolderScope = searchFilters.folderScope || 'current';

    return emails.filter((mail) => {
      const isTrashed = trashIds.has(mail.publicId);

      // Folder routing / scope filtering
      if (activeFolderScope !== 'current') {
        if (activeFolderScope === 'all') {
          // Show all non-binned messages
          if (isTrashed) return false;
        } else if (activeFolderScope === 'trash') {
          if (!isTrashed) return false;
        } else {
          if (isTrashed) return false;
          if (activeFolderScope === 'inbox' && mail.recipientAddress !== currentUser.emailAddress) return false;
          if (activeFolderScope === 'sent' && !mail.senderAddress.includes(currentUser.phone)) return false;
          if (activeFolderScope === 'drafts' && !mail.isDraft) return false;
          if (activeFolderScope === 'scheduled' && mail.deliveryStatus !== 'scheduled') return false;
          if (activeFolderScope === 'spam' && !mail.isSpam) return false;
        }
      } else {
        // Standard current folder routing
        // Bin view: show ONLY binned emails
        if (folder === 'bin' || folder === 'trash') {
          if (!isTrashed) return false;
        } else {
          // Non-bin views: exclude binned emails
          if (isTrashed) return false;
          if (mail.isDraft && folder !== 'drafts') return false;
          if (mail.deliveryStatus === 'scheduled' && folder !== 'scheduled') return false;

          // Spam filtering
          if (folder === 'spam') {
            if (!mail.isSpam) return false;
          } else {
            if (mail.isSpam) return false;
          }

          // Specific folder routing
          if (folder === 'starred') {
            if (!starredIds.has(mail.publicId)) return false;
          } else if (folder === 'snoozed') {
            return false;
          } else if (folder === 'important') {
            if (!isImportantMail(mail, starredIds)) return false;
          } else if (folder === 'sent') {
            if (!mail.senderAddress.includes(currentUser.phone)) return false;
          } else if (folder === 'scheduled') {
            if (mail.deliveryStatus !== 'scheduled') return false;
          } else if (folder === 'drafts') {
            if (!mail.isDraft) return false;
          } else if (folder === 'allmail') {
            // Shows all non-binned messages
          } else if (folder === 'purchases') {
            if (!isPurchaseMail(mail)) return false;
          } else if (folder === 'social') {
            if (!isSocialMail(mail)) return false;
          } else if (folder === 'promotions') {
            if (!isPromoMail(mail)) return false;
          } else if (folder === 'updates') {
            if (!isUpdateMail(mail)) return false;
          } else if (folder === 'inbox') {
            if (mail.recipientAddress !== currentUser.emailAddress) return false;
            if (categoryTab === 'promotions' && !isPromoMail(mail)) return false;
            if (categoryTab === 'social' && !isSocialMail(mail)) return false;
            if (categoryTab === 'updates' && !isUpdateMail(mail)) return false;
          }
        }
      }

      // Advanced Filter Criteria
      if (searchFilters.from && searchFilters.from.trim()) {
        const fromQ = searchFilters.from.trim().toLowerCase();
        if (!mail.senderAddress.toLowerCase().includes(fromQ)) return false;
      }

      if (searchFilters.to && searchFilters.to.trim()) {
        const toQ = searchFilters.to.trim().toLowerCase();
        if (!mail.recipientAddress.toLowerCase().includes(toQ)) return false;
      }

      if (searchFilters.subject && searchFilters.subject.trim()) {
        const subjQ = searchFilters.subject.trim().toLowerCase();
        if (!mail.subject.toLowerCase().includes(subjQ)) return false;
      }

      if (searchFilters.hasWords && searchFilters.hasWords.trim()) {
        const wordsQ = searchFilters.hasWords.trim().toLowerCase();
        const hasMatch = mail.textBody.toLowerCase().includes(wordsQ) || mail.subject.toLowerCase().includes(wordsQ);
        if (!hasMatch) return false;
      }

      if (searchFilters.hasAttachment) {
        if (!mail.attachments || mail.attachments.length === 0) return false;
      }

      if (searchFilters.isStarred) {
        if (!starredIds.has(mail.publicId)) return false;
      }

      if (searchFilters.isUnread) {
        if (mail.readAt) return false;
      }

      if (searchFilters.dateRange && searchFilters.dateRange !== 'all') {
        const mailTime = new Date(mail.createdAt).getTime();
        const now = Date.now();
        let maxAgeMs = 0;
        if (searchFilters.dateRange === '1d') maxAgeMs = 24 * 60 * 60 * 1000;
        else if (searchFilters.dateRange === '3d') maxAgeMs = 3 * 24 * 60 * 60 * 1000;
        else if (searchFilters.dateRange === '7d') maxAgeMs = 7 * 24 * 60 * 60 * 1000;
        else if (searchFilters.dateRange === '30d') maxAgeMs = 30 * 24 * 60 * 60 * 1000;
        else if (searchFilters.dateRange === '1y') maxAgeMs = 365 * 24 * 60 * 60 * 1000;
        if (maxAgeMs > 0 && now - mailTime > maxAgeMs) return false;
      }

      // General Query Search
      const effectiveQuery = (searchFilters.query || searchQuery).trim().toLowerCase();
      if (effectiveQuery) {
        const matchesQuery =
          mail.subject.toLowerCase().includes(effectiveQuery) ||
          mail.senderAddress.toLowerCase().includes(effectiveQuery) ||
          mail.recipientAddress.toLowerCase().includes(effectiveQuery) ||
          mail.textBody.toLowerCase().includes(effectiveQuery);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [emails, folder, categoryTab, searchQuery, searchFilters, starredIds, trashIds, currentUser.phone, currentUser.emailAddress]);

  const selectedEmail = useMemo(() => {
    if (!mailId) return null;
    return emails.find((m) => m.publicId === mailId) || null;
  }, [emails, mailId]);

  const handleSelectEmail = (mail: Email) => {
    if (mail.isDraft) {
      setComposePrefill({ to: mail.recipientAddress, subject: mail.subject, body: mail.textBody, draftId: mail.publicId, draftAttachments: mail.attachments });
      setIsComposeOpen(true);
      return;
    }
    navigate(`/mail/${folder}/${mail.publicId}`);
    if (!mail.isTrashed) void api.getEmail(mail.publicId).then(loadMail).catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Could not open this message.'));
  };

  const handleCloseReadingPane = () => {
    navigate(`/mail/${folder}`);
  };

  const onReply = (to: string, subject: string, replyToId?: string) => {
    setComposePrefill({
      to,
      subject: replyToId ? (subject.startsWith('Re:') ? subject : `Re: ${subject}`) : subject,
      replyToId,
    });
    setIsComposeOpen(true);
  };

  const onDeleteFromPane = (id: string) => {
    handleMoveToBin(id);
    navigate(`/mail/${folder}`);
  };

  const onRestoreFromPane = (id: string) => {
    handleRestoreFromBin(id);
    navigate(`/mail/${folder}`);
  };

  const onPermanentDeleteFromPane = (id: string) => {
    handlePermanentDelete(id);
    navigate(`/mail/${folder}`);
  };

  // Cancels the selected scheduled message and reports backend failures.
  const onCancelScheduled = (id: string) => {
    void handleCancelScheduled(id).catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Could not cancel scheduled email.'));
  };

  // Applies a newly selected delivery time to a pending scheduled message.
  const onRescheduleScheduled = (id: string, scheduledAt: string) => {
    void handleRescheduleScheduled(id, scheduledAt).catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Could not reschedule email.'));
  };

  // Selection & bulk action handlers
  const handleToggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    setCheckedEmailIds((prev) => {
      if (filteredEmails.length > 0 && filteredEmails.every((e) => prev.has(e.publicId))) {
        return new Set();
      } else {
        return new Set(filteredEmails.map((e) => e.publicId));
      }
    });
  };

  const handleClearSelection = () => {
    setCheckedEmailIds(new Set());
  };

  const handleBatchRead = (read: boolean, overrideIds?: string[]) => {
    const ids = overrideIds && overrideIds.length > 0 ? overrideIds : Array.from(checkedEmailIds);
    if (ids.length === 0) return;
    void handleMarkRead(ids, read);
  };

  const handleBatchStar = (star: boolean, overrideIds?: string[]) => {
    const ids = overrideIds && overrideIds.length > 0 ? overrideIds : Array.from(checkedEmailIds);
    if (ids.length === 0) return;
    void handleBatchAction(ids, star ? 'star' : 'unstar');
  };

  const handleBatchTrash = () => {
    const ids = Array.from(checkedEmailIds);
    if (ids.length === 0) return;
    setCheckedEmailIds(new Set());
    void handleBatchAction(ids, 'trash');
  };

  const handleBatchSpam = (spam: boolean) => {
    const ids = Array.from(checkedEmailIds);
    if (ids.length === 0) return;
    setCheckedEmailIds(new Set());
    void handleBatchAction(ids, spam ? 'spam' : 'unspam');
  };

  const handleBatchLabel = (action: 'important' | 'inbox' | 'spam' | 'trash') => {
    const ids = Array.from(checkedEmailIds);
    if (ids.length === 0) return;
    if (action === 'important') {
      void handleBatchAction(ids, 'star');
    } else if (action === 'trash') {
      setCheckedEmailIds(new Set());
      void handleBatchAction(ids, 'trash');
    } else if (action === 'spam') {
      setCheckedEmailIds(new Set());
      void handleBatchAction(ids, 'spam');
    }
  };

  const handleSingleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const mail = emails.find((m) => m.publicId === id);
    if (mail) {
      void handleMarkRead([id], !mail.readAt);
    }
  };

  const handleSingleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleMoveToBin(id);
  };

  const handleSingleSpam = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleSpam(id, true);
  };

  return (
    <main style={styles.workspaceContainer}>
      {loadError && <div role="alert" style={styles.errorBanner}>{loadError}</div>}
      {/* Email List View */}
      <EmailList
        emails={filteredEmails}
        folder={folder}
        categoryTab={categoryTab}
        onSelectCategoryTab={setCategoryTab}
        selectedEmailId={selectedEmail ? selectedEmail.publicId : null}
        starredIds={starredIds}
        checkedEmailIds={checkedEmailIds}
        onSelectEmail={handleSelectEmail}
        onToggleStar={handleToggleStar}
        onToggleCheck={handleToggleCheck}
        onToggleSelectAll={handleToggleSelectAll}
        onBatchRead={handleBatchRead}
        onBatchStar={handleBatchStar}
        onBatchTrash={handleBatchTrash}
        onBatchSpam={handleBatchSpam}
        onBatchLabel={handleBatchLabel}
        onClearSelection={handleClearSelection}
        onSingleToggleRead={handleSingleToggleRead}
        onSingleDelete={handleSingleDelete}
        onSingleSpam={handleSingleSpam}
        onEmptyBin={handleEmptyBin}
        onRefresh={loadMail}
        refreshing={refreshing}
        isMobile={isMobile}
        hasSelectedEmail={!!selectedEmail}
      />

      {/* Reading Pane View */}
      {selectedEmail && (
        <ReadingPane
          email={selectedEmail}
          folder={folder}
          onClose={handleCloseReadingPane}
          onMoveToBin={onDeleteFromPane}
          onRestoreFromBin={onRestoreFromPane}
          onPermanentDelete={onPermanentDeleteFromPane}
          onReply={onReply}
          userAddress={currentUser.emailAddress}
          onCancelScheduled={onCancelScheduled}
          onRescheduleScheduled={onRescheduleScheduled}
          canReportSpam={selectedEmail.recipientAddress === currentUser.emailAddress && !selectedEmail.isDraft}
          onToggleSpam={(id, spam) => handleToggleSpam(id, spam)}
        />
      )}
    </main>
  );
};

const styles: Record<string, React.CSSProperties> = {
  workspaceContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
    height: '100%',
    minWidth: 0,
  },
  errorBanner: {
    position: 'absolute',
    zIndex: 30,
    top: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 14px',
    borderRadius: 8,
    background: '#FFF1F0',
    color: '#A12622',
    fontSize: 13,
  },
};
