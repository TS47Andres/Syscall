import React, { useRef } from 'react';
import type { Email } from '../../types';
import {
  IconStar,
  IconAttach,
  IconShieldCheck,
  IconShieldAlert,
  IconCheck,
  IconMailRead,
  IconMailUnread,
  IconTrash,
  IconSpam,
} from '../Icons';

interface EmailRowProps {
  email: Email;
  folder: string;
  isSelected: boolean;
  isStarred: boolean;
  isChecked: boolean;
  isMobile?: boolean;
  hasSelectionActive?: boolean;
  onSelect: (email: Email) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onToggleCheck: (id: string, e: React.MouseEvent) => void;
  onToggleRead?: (id: string, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onToggleSpam?: (id: string, e: React.MouseEvent) => void;
}

export const EmailRow: React.FC<EmailRowProps> = ({
  email,
  folder,
  isSelected,
  isStarred,
  isChecked,
  isMobile,
  hasSelectionActive,
  onSelect,
  onToggleStar,
  onToggleCheck,
  onToggleRead,
  onDelete,
  onToggleSpam,
}) => {
  const isUnread = !email.readAt;
  const showRecipient = folder === 'sent' || (email.isSender && folder !== 'drafts' && folder !== 'scheduled');
  const displayedAddress = showRecipient ? email.recipientAddress : email.senderAddress;
  const displayedName = showRecipient ? email.recipientName : email.senderName;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggered.current = false;

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(40);
        }
      } catch {}
      onToggleCheck(email.publicId, e as unknown as React.MouseEvent);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    if (isMobile && hasSelectionActive) {
      onToggleCheck(email.publicId, e);
      return;
    }

    onSelect(email);
  };

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
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`gmail-email-row ${isSelected ? 'selected' : ''} ${isChecked ? 'checked' : ''} ${isUnread ? 'unread' : 'read'}`}
      style={{
        ...styles.row,
        backgroundColor: isChecked ? '#C2E7FF' : isSelected ? '#D3E3FD' : isUnread ? '#FFFFFF' : '#F6F8FC',
        fontWeight: isUnread ? 700 : 400,
      }}
    >
      {/* Checkbox button (DESKTOP ONLY - hidden on mobile responsive) */}
      {!isMobile && (
        <button
          type="button"
          className="gmail-row-checkbox-btn hide-on-mobile"
          onClick={(e) => onToggleCheck(email.publicId, e)}
          title={isChecked ? 'Deselect message' : 'Select message'}
          aria-label={isChecked ? 'Deselect message' : 'Select message'}
          style={styles.checkboxBtn}
        >
          <div
            className={`gmail-custom-checkbox ${isChecked ? 'is-active' : ''}`}
            style={{
              ...styles.checkboxBox,
              backgroundColor: isChecked ? '#0B57D0' : 'transparent',
              borderColor: isChecked ? '#0B57D0' : '#747775',
            }}
          >
            {isChecked && <IconCheck size={12} color="#FFFFFF" />}
          </div>
        </button>
      )}

      {/* Star button */}
      <button
        type="button"
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
        {(displayedName?.trim() || displayedAddress).slice(0, 2).toUpperCase()}
      </div>

      {/* Sender Name / Phone */}
      <div style={styles.senderCol} title={displayedAddress}>
        <span style={{ fontSize: 13.5, color: '#1F1F1F' }}>
          {displayedName?.trim() || formatPhone(displayedAddress)}
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

      {/* Hover Quick Action Buttons */}
      <div className="gmail-row-hover-actions" style={styles.hoverActions}>
        {onToggleRead && (
          <button
            type="button"
            className="gmail-row-action-btn"
            onClick={(e) => onToggleRead(email.publicId, e)}
            title={isUnread ? 'Mark as read' : 'Mark as unread'}
            style={styles.actionBtn}
          >
            {isUnread ? (
              <IconMailRead size={17} color="#444746" />
            ) : (
              <IconMailUnread size={17} color="#444746" />
            )}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="gmail-row-action-btn"
            onClick={(e) => onDelete(email.publicId, e)}
            title="Delete"
            style={styles.actionBtn}
          >
            <IconTrash size={17} color="#444746" />
          </button>
        )}
        {onToggleSpam && folder !== 'spam' && folder !== 'bin' && (
          <button
            type="button"
            className="gmail-row-action-btn"
            onClick={(e) => onToggleSpam(email.publicId, e)}
            title="Report spam"
            style={styles.actionBtn}
          >
            <IconSpam size={17} color="#444746" />
          </button>
        )}
      </div>

      {/* Right Column: Attachment Badge & Date */}
      <div className="gmail-row-date-group" style={styles.rightCol}>
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
    position: 'relative',
    WebkitTouchCallout: 'none',
  },
  checkboxBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
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
  hoverActions: {
    display: 'none',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#444746',
    transition: 'background-color 0.15s ease',
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
