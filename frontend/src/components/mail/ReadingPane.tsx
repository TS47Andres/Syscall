/**
 * File: ReadingPane.tsx
 * Role: Displays real mail content and actions for replies, trash, spam, and schedules.
 * Service: Frontend.
 */
import React from 'react';
import type { Email } from '../../types';
import {
  IconArrowBack,
  IconTrash,
  IconReply,
  IconForward,
  IconLink,
  IconSpam,
} from '../Icons';
import { AttachmentCard } from './AttachmentCard';
import { VoicemailPlayer } from './VoicemailPlayer';
import { useMail } from '../../context/MailContext';
import { t } from '../../utils/i18n';

interface ReadingPaneProps {
  email: Email;
  folder: string;
  onClose: () => void;
  onMoveToBin: (id: string) => void;
  onRestoreFromBin: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onReply: (to: string, subject: string, replyToId?: string) => void;
  onCancelScheduled?: (id: string) => void;
  onRescheduleScheduled?: (id: string, scheduledAt: string) => void;
  canReportSpam?: boolean;
  onToggleSpam?: (id: string, spam: boolean) => void;
  userAddress: string;
}

export const renderFormattedText = (text: string, onReply?: (to: string) => void) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@niti)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="email-hyperlink"
          title={`Open external link: ${part}`}
        >
          <IconLink size={12} color="#0B57D0" />
          <span>{part}</span>
        </a>
      );
    }
    if (part.startsWith('www.')) {
      return (
        <a
          key={i}
          href={`https://${part}`}
          target="_blank"
          rel="noopener noreferrer"
          className="email-hyperlink"
          title={`Open external link: https://${part}`}
        >
          <IconLink size={12} color="#0B57D0" />
          <span>{part}</span>
        </a>
      );
    }
    if (part.endsWith('@niti')) {
      return (
        <span
          key={i}
          className="email-hyperlink"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (onReply) onReply(part);
          }}
          title={`Compose PhoneMail to ${part}`}
        >
          <span>{part}</span>
        </span>
      );
    }
    return part;
  });
};

export const ReadingPane: React.FC<ReadingPaneProps> = ({
  email,
  folder,
  onClose,
  onMoveToBin,
  onRestoreFromBin,
  onPermanentDelete,
  onReply,
  onCancelScheduled,
  onRescheduleScheduled,
  canReportSpam = false,
  onToggleSpam,
  userAddress,
}) => {
  const formatPhone = (addr: string) => {
    const raw = addr.replace(/\D/g, '').slice(-10);
    return raw.length === 10 ? `+91 ${raw.slice(0, 5)} ${raw.slice(5)}` : addr;
  };

  // Prompts for a new local delivery time and submits a valid future ISO timestamp.
  const requestReschedule = (): void => {
    const value = window.prompt('Enter a new delivery time in your local timezone (example: 2026-10-01 14:30):');
    if (!value) return;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) { window.alert('Enter a valid future date and time.'); return; }
    onRescheduleScheduled?.(email.publicId, date.toISOString());
  };

  // Chooses the other participant as the default reply destination.
  const replyAddress = email.senderAddress === userAddress ? email.recipientAddress : email.senderAddress;

  const getAvatarBg = (address: string) => {
    const colors = ['#E8DEF8', '#D3E3FD', '#C2E7FF', '#C4EDD9', '#FFD8D8', '#FFE7A5', '#E0F2FE'];
    let hash = 0;
    for (let i = 0; i < address.length; i++) hash += address.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const isVoicemail =
    email.subject.toLowerCase().includes('voicemail') ||
    email.textBody.toLowerCase().includes('recording') ||
    email.subject.toLowerCase().includes('telecom');

  const { currentUser } = useMail();
  const lang = currentUser?.language || 'en';

  return (
    <main className="gmail-reading-pane" style={styles.container}>
      {/* Top Action Toolbar */}
      <div style={styles.toolbar}>
        <button
          style={styles.closeBtn}
          onClick={onClose}
          title={t('back_to_mail', lang)}
        >
          <IconArrowBack size={16} color="#1F1F1F" />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{t('back_to_mail', lang)}</span>
        </button>

        <div style={styles.toolbarRight}>
          {folder === 'scheduled' ? (
            <>
              <button style={styles.restoreBtn} onClick={requestReschedule}>Reschedule</button>
              <button style={styles.deleteForeverBtn} onClick={() => onCancelScheduled?.(email.publicId)}>Cancel schedule</button>
            </>
          ) : folder === 'bin' || folder === 'trash' ? (
            <>
              <button
                style={styles.restoreBtn}
                onClick={() => onRestoreFromBin(email.publicId)}
                title="Restore email to original folder"
              >
                Restore
              </button>
              <button
                style={styles.deleteForeverBtn}
                onClick={() => onPermanentDelete(email.publicId)}
                title="Delete this message permanently"
              >
                Delete forever
              </button>
            </>
          ) : (
            <>
              <button
                style={styles.toolbarIconBtn}
                onClick={() => onMoveToBin(email.publicId)}
                title={t('bin', lang)}
              >
                <IconTrash size={18} color="#444746" />
              </button>
              {canReportSpam && <button style={styles.toolbarIconBtn} onClick={() => onToggleSpam?.(email.publicId, !email.isSpam)} title={email.isSpam ? 'Not spam' : 'Report spam'}><IconSpam size={18} color={email.isSpam ? '#BA1A1A' : '#444746'} /></button>}
              <button
                style={styles.replyHeaderBtn}
                onClick={() => onReply(replyAddress, `Re: ${email.subject}`, email.publicId)}
                title={t('reply', lang)}
              >
                <IconReply size={14} color="#1F1F1F" />
                <span>{t('reply', lang)}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reading Content Area */}
      <div style={styles.readingBodyScroll} className="gmail-reading-scroll no-scrollbar">
        <h1 style={styles.subjectTitle}>{email.subject}</h1>

        {/* Sender Info Card */}
        <div style={styles.senderCard}>
          <div
            className="gmail-avatar"
            style={{
              backgroundColor: getAvatarBg(email.senderAddress),
              width: 44,
              height: 44,
              fontSize: 15,
            }}
          >
            {email.senderAddress.slice(0, 2).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 15, color: '#1F1F1F' }}>
                  {formatPhone(email.senderAddress)}
                </strong>
                <span style={{ fontSize: 12, color: '#747775' }}>
                  &lt;{email.senderAddress}&gt;
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#747775' }}>
                {new Date(email.createdAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#444746', marginTop: 2 }}>
              to {email.recipientAddress}
            </div>
          </div>
        </div>

        {/* Voicemail Player */}
        {isVoicemail && <VoicemailPlayer senderAddress={email.senderAddress} />}

        {/* Body Paragraphs with Hyperlinks */}
        <div style={styles.emailBodyTypography}>
          {email.textBody.split('\n\n').map((paragraph, index) => (
            <p key={index} style={{ marginBottom: 14 }}>
              {renderFormattedText(paragraph, (addr) => onReply(addr, '', undefined))}
            </p>
          ))}
        </div>

        {/* Attachments Section */}
        {email.attachments && email.attachments.length > 0 && (
          <div style={styles.attachmentsContainer}>
            <span style={styles.attachmentsHeading}>
              Attachments ({email.attachments.length})
            </span>
            <div style={styles.attachmentsGrid}>
              {email.attachments.map((file, i) => (
                <AttachmentCard key={i} attachment={file} messageId={email.publicId} attachmentIndex={i} />
              ))}
            </div>
          </div>
        )}

        {/* Bottom Quick Actions */}
        <div style={styles.bottomActions}>
          <button
            style={styles.bottomActionBtn}
            onClick={() => onReply(replyAddress, `Re: ${email.subject}`, email.publicId)}
          >
            <IconReply size={14} color="#1F1F1F" />
            <span>Reply</span>
          </button>
          <button
            style={styles.bottomActionBtn}
            onClick={() => onReply('', `Fwd: ${email.subject}`)}
          >
            <IconForward size={14} color="#1F1F1F" />
            <span>Forward</span>
          </button>
        </div>
      </div>
    </main>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1.4,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    margin: '0 16px 16px 0',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(60,64,67,0.06)',
    minWidth: 0,
  },
  toolbar: {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    borderBottom: '1px solid #F1F3F4',
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '20px',
    backgroundColor: '#F1F3F4',
    color: '#1F1F1F',
    cursor: 'pointer',
    border: 'none',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolbarIconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    border: 'none',
  },
  restoreBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '16px',
    backgroundColor: '#E8F0FE',
    color: '#0B57D0',
    fontWeight: 600,
    fontSize: '12.5px',
    cursor: 'pointer',
    border: 'none',
  },
  deleteForeverBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '16px',
    backgroundColor: '#FCE8E6',
    color: '#C5221F',
    fontWeight: 600,
    fontSize: '12.5px',
    cursor: 'pointer',
    border: 'none',
  },
  replyHeaderBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '18px',
    backgroundColor: '#F1F3F4',
    color: '#1F1F1F',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    border: 'none',
  },
  readingBodyScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  subjectTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 700,
    color: '#1F1F1F',
    marginBottom: '16px',
    lineHeight: 1.3,
  },
  senderCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    paddingBottom: '16px',
    borderBottom: '1px solid #F1F3F4',
  },
  emailBodyTypography: {
    fontSize: '14.5px',
    lineHeight: '1.7',
    color: '#1F1F1F',
    marginTop: '20px',
  },
  attachmentsContainer: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #F1F3F4',
  },
  attachmentsHeading: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#444746',
    display: 'block',
    marginBottom: '10px',
  },
  attachmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '10px',
  },
  bottomActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '28px',
    paddingTop: '16px',
    borderTop: '1px solid #F1F3F4',
    flexWrap: 'wrap',
  },
  bottomActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: '#F1F3F4',
    color: '#1F1F1F',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    border: 'none',
  },
};
