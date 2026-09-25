import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMail } from '../context/MailContext';
import type { Email } from '../types';
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
    loadMail,
    handleMoveToBin,
    handleRestoreFromBin,
    handlePermanentDelete,
    handleEmptyBin,
    handleToggleStar,
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
        return false;
      } else if (folder === 'drafts') {
        return false;
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
    navigate(`/mail/${folder}/${mail.publicId}`);
  };

  const handleCloseReadingPane = () => {
    navigate(`/mail/${folder}`);
  };

  const onReply = (to: string, subject: string) => {
    setComposePrefill({
      to,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
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

  return (
    <main style={styles.workspaceContainer}>
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
};
