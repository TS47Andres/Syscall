import React, { useState, useRef } from 'react';
import { api } from '../api';
import { IconCompose, IconClose, IconShieldCheck, IconSent } from './Icons';

interface ComposeModalProps {
  initialTo?: string;
  onClose: () => void;
  onSent: (newMail: { to: string; subject: string; textBody: string }) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ initialTo = '', onClose, onSent }) => {
  const [toInput, setToInput] = useState<string>(initialTo);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Floating window movable across entire page
  const [pos, setPos] = useState<{ x?: number; y?: number }>({});
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0) return;
    const modal = e.currentTarget.parentElement;
    if (!modal) return;
    const rect = modal.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const newX = Math.max(8, Math.min(window.innerWidth - 240, dragRef.current.initX + deltaX));
    const newY = Math.max(8, Math.min(window.innerHeight - 50, dragRef.current.initY + deltaY));
    setPos({ x: newX, y: newY });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const normalizeToAddress = (val: string): string => {
    let clean = val.trim();
    if (clean.includes('@')) {
      const parts = clean.split('@');
      const phoneDigits = parts[0].replace(/\D/g, '').slice(-10);
      return `${phoneDigits}@${parts[1] || 'niti'}`;
    }
    const raw10 = clean.replace(/\D/g, '').slice(-10);
    return raw10 ? `${raw10}@niti` : clean;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTo = normalizeToAddress(toInput);
    if (!finalTo.endsWith('@niti')) {
      setErrorMsg('Recipient must be a valid Indian PhoneMail address (e.g. 9876543210@niti)');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Please enter a subject.');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    try {
      await api.sendMail(finalTo, subject, body);
      onSent({ to: finalTo, subject, textBody: body });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch email.');
    } finally {
      setSending(false);
    }
  };

  const dockStyle: React.CSSProperties = {
    ...(isMinimized ? styles.minimizedDock : styles.floatingDock),
    ...(pos.x !== undefined && pos.y !== undefined
      ? {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          right: 'auto',
          bottom: 'auto',
        }
      : {}),
  };

  return (
    <div style={dockStyle} className="animate-fade-in">
      {/* Header Bar - Draggable across entire page */}
      <div
        style={{
          ...styles.header,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
      >
        <div
          style={styles.headerLeft}
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? 'Expand' : 'Minimize'}
        >
          <IconCompose size={17} color="#0B57D0" />
          <span style={styles.title}>
            {subject.trim() ? subject : 'New Message'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            style={styles.headerIconBtn}
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <span style={{ fontSize: 14, lineHeight: '10px', fontWeight: 700, color: '#444746' }}>—</span>
          </button>
          <button
            style={styles.headerIconBtn}
            onClick={onClose}
            title="Discard & Close"
          >
            <IconClose size={16} color="#444746" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div style={styles.contentWrap} className="no-scrollbar">
          {errorMsg && (
            <div style={styles.errorBox}>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSend} style={styles.form}>
            {/* Recipient Input */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>To:</label>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onBlur={() => setToInput(normalizeToAddress(toInput))}
                  placeholder="10-digit mobile number"
                  style={styles.fieldInput}
                  autoFocus
                  required
                />
                <span style={styles.domainTag}>@niti</span>
              </div>
            </div>

            {/* Subject */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your message"
                style={styles.fieldInput}
                required
              />
            </div>

            {/* Body: Scrollable section with turned-off scrollbar visibility and no extending resize */}
            <div style={styles.bodyWrapper}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email here..."
                style={styles.bodyTextarea}
                className="no-scrollbar"
                rows={7}
              />
            </div>

            {/* Actions: Discard with Shield Tooltip next to it, and Send Syscall button */}
            <div style={styles.actionRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={onClose} style={styles.cancelBtn}>
                  Discard
                </button>
                <span
                  title="Protected by ClamAV real-time antivirus scan"
                  data-tooltip="Protected by ClamAV real-time antivirus scan"
                  style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
                >
                  <IconShieldCheck size={18} color="#146C2E" />
                </span>
              </div>

              <button type="submit" disabled={sending} style={styles.sendBtn}>
                <IconSent size={15} color="#FFFFFF" />
                <span>{sending ? 'Queueing...' : 'Send Syscall'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  floatingDock: {
    position: 'fixed',
    bottom: 0,
    right: '80px',
    width: '540px',
    maxWidth: 'calc(100vw - 24px)',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px 12px 0 0',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1100,
    overflow: 'hidden',
  },
  minimizedDock: {
    position: 'fixed',
    bottom: 0,
    right: '80px',
    width: '260px',
    height: '42px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px 8px 0 0',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1100,
    overflow: 'hidden',
  },
  header: {
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px 0 16px',
    backgroundColor: '#F2F6FC',
    borderBottom: '1px solid #E0E2EC',
    userSelect: 'none',
    touchAction: 'none',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: '13.5px',
    fontWeight: 600,
    color: '#1F1F1F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerIconBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#444746',
    background: 'none',
    border: 'none',
  },
  contentWrap: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: 'calc(90vh - 80px)',
    overflowY: 'auto',
  },
  errorBox: {
    background: '#FDF2F2',
    border: '1px solid rgba(220, 38, 38, 0.2)',
    color: '#DC2626',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #E0E2EC',
    paddingBottom: '8px',
  },
  label: {
    width: '64px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#444746',
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  },
  fieldInput: {
    flex: 1,
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: '#1F1F1F',
    background: 'transparent',
    outline: 'none',
  },
  domainTag: {
    fontFamily: 'monospace',
    fontSize: '12px',
    fontWeight: 700,
    color: '#0B57D0',
    backgroundColor: '#EAF1FB',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  bodyWrapper: {
    border: '1px solid #E0E2EC',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#FFFFFF',
  },
  bodyTextarea: {
    width: '100%',
    border: 'none',
    padding: '12px',
    fontSize: '13.5px',
    lineHeight: '1.6',
    color: '#1F1F1F',
    resize: 'none', // Removed extending bottom right resize handle
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    overflowY: 'auto',
    maxHeight: '220px',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '6px',
  },
  cancelBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#5E5E5E',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  sendBtn: {
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(11, 87, 208, 0.3)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
};
