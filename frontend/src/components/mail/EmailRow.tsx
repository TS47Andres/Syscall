import React from 'react';
import type { Email } from '../../types';
import {
  IconStar,
  IconAttach,
  IconShieldCheck,
  IconShieldAlert,
} from '../Icons';

interface EmailRowProps {
  email: Email;
  folder: string;
  isSelected: boolean;
  isStarred: boolean;
  onSelect: (email: Email) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
}

export const EmailRow: React.FC<EmailRowProps> = ({
  email,
  folder,
  isSelected,
  isStarred,
  onSelect,
  onToggleStar,
}) => {
  const isUnread = !email.readAt;
  const displayedAddress = folder === 'sent' ? email.recipientAddress : email.senderAddress;

  const formatPhone = (addr: string) => {
    const raw = addr.replace(/\D/g, '').slice(-10);
    return raw.length === 10 ? `+91 ${raw.slice(0, 5)} ${raw.slice(5)}` : addr;
  };

  const getAvatarBg = (address: string) => {
    const colors = ['#E8DEF8', '#D3E3FD', '#C2E7FF', '#C4EDD9', '#FFD8D8', '#FFE7A5', '#E0F2FE'];
    let hash = 0;
    for (let i = 0; i < address.length; i++) hash += address.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const hasAttachments = email.attachments && email.attachments.length > 0;
  const hasInfected = hasAttachments && email.attachments!.some((a) => a.clamavStatus === 'infected');

  return (
    <div
      onClick={() => onSelect(email)}
      className={`gmail-email-row ${isSelected ? 'selected' : ''} ${isUnread ? 'unread' : 'read'}`}
      style={{
        ...styles.row,
        backgroundColor: isSelected ? '#D3E3FD' : isUnread ? '#FFFFFF' : '#F6F8FC',
        fontWeight: isUnread ? 700 : 400,
      }}
    >
      {/* Star button */}
      <button
        style={styles.starBtn}
        onClick={(e) => onToggleStar(email.publicId, e)}
        title={isStarred ? 'Starred' : 'Not starred'}
      >
        <IconStar size={17} filled={isStarred} color={isStarred ? '#E37400' : '#BDC1C6'} />
      </button>

      {/* Sender Avatar */}
      <div
        className="gmail-avatar"
        style={{
          backgroundColor: getAvatarBg(displayedAddress),
          width: 32,
          height: 32,
          fontSize: 12,
        }}
      >
        {displayedAddress.slice(0, 2).toUpperCase()}
      </div>

      {/* Sender Name / Phone */}
      <div style={styles.senderCol} title={displayedAddress}>
        <span style={{ fontSize: 13.5, color: '#1F1F1F' }}>
          {formatPhone(displayedAddress)}
        </span>
      </div>

      {/* Subject + Snippet Preview */}
      <div style={styles.snippetCol}>
        <span style={{ ...styles.subjectText, color: isUnread ? '#1F1F1F' : '#444746' }}>
          {email.subject}
        </span>
        <span style={styles.separatorDash}>-</span>
        <span style={styles.snippetText}>{email.textBody}</span>
      </div>

      {/* Right Column: Attachment Badge & Date */}
      <div style={styles.rightCol}>
        {hasAttachments && (
          <span
            style={{
              ...styles.attachmentBadge,
              color: hasInfected ? '#DC2626' : '#146C2E',
              backgroundColor: hasInfected ? '#FEE2E2' : '#DCFCE7',
            }}
            title={`${email.attachments!.length} attachment(s)`}
          >
            <IconAttach size={12} color="currentColor" />
            <span>{email.attachments!.length}</span>
            {hasInfected ? (
              <IconShieldAlert size={11} color="#DC2626" />
            ) : (
              <IconShieldCheck size={11} color="#146C2E" />
            )}
          </span>
        )}

        <span style={styles.dateText}>
          {new Date(email.createdAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 16px',
    height: '48px',
    borderBottom: '1px solid #F1F3F4',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.15s ease',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  senderCol: {
    width: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  snippetCol: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  subjectText: {
    fontSize: '13.5px',
    flexShrink: 0,
  },
  separatorDash: {
    margin: '0 6px',
    color: '#747775',
    fontSize: '13px',
    flexShrink: 0,
  },
  snippetText: {
    fontSize: '13px',
    color: '#747775',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rightCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  attachmentBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '8px',
  },
  dateText: {
    fontSize: '12px',
    color: '#747775',
    width: '68px',
    textAlign: 'right',
  },
};
