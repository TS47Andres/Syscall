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
    handleCancelScheduled,
    handleRescheduleScheduled,
    setIsComposeOpen,
    setComposePrefill,
  } = useMail();

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

  // Filtered emails based on folder, category tabs, and search query
  const filteredEmails = useMemo(() => {
    return emails.filter((mail) => {
      const isTrashed = trashIds.has(mail.publicId);

      // Bin view: show ONLY binned emails
      if (folder === 'bin' || folder === 'trash') {
        if (!isTrashed) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            mail.subject.toLowerCase().includes(q) ||
            mail.senderAddress.toLowerCase().includes(q) ||
            mail.textBody.toLowerCase().includes(q)
          );
        }
        return true;
      }

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
        if (categoryTab === 'updates') {
          if (!isUpdateMail(mail)) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          mail.subject.toLowerCase().includes(q) ||
          mail.senderAddress.toLowerCase().includes(q) ||
          mail.textBody.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [emails, folder, categoryTab, searchQuery, starredIds, trashIds, currentUser.phone]);

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
        onSelectEmail={handleSelectEmail}
        onToggleStar={handleToggleStar}
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
