/**
 * File: ComposeModal.tsx
 * Role: Composes, schedules, and saves messages using backend callbacks.
 * Service: Frontend.
 */
import React, { useState, useRef } from 'react';
import {
  IconCompose,
  IconClose,
  IconShieldCheck,
  IconSent,
  IconAttach,
  IconScheduled,
  IconSarvamAI,
} from './Icons';
import { ModernSchedulePicker } from './compose/ModernSchedulePicker';
import { api } from '../api';
import type { Attachment } from '../types';

interface ComposeModalProps {
  initialTo?: string;
  onClose: () => void;
  onSent: (newMail: { to: string; subject: string; textBody: string; attachments?: File[]; replyToId?: string; draftId?: string }) => Promise<void> | void;
  onSaveDraft: (draft: { to: string; subject: string; textBody: string; attachments?: File[]; draftId?: string }) => Promise<void>;
  onSchedule: (message: { to: string; subject: string; textBody: string; scheduledAt: string; attachments?: File[] }) => Promise<void>;
  initialSubject?: string;
  initialBody?: string;
  replyToId?: string;
  draftId?: string;
  initialAttachments?: Attachment[];
  mailDomain?: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ initialTo = '', initialSubject = '', initialBody = '', replyToId, draftId, initialAttachments = [], mailDomain = 'niti', onClose, onSent, onSaveDraft, onSchedule }) => {
  const [toInput, setToInput] = useState<string>(initialTo);
  const [subject, setSubject] = useState<string>(initialSubject);
  const [body, setBody] = useState<string>(initialBody);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [generatingEmail, setGeneratingEmail] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentsChanged, setAttachmentsChanged] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sending, setSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState<boolean>(Boolean(scheduledAt));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) {
      setAttachments((prev) => [...prev, ...selected]);
      setAttachmentsChanged(true);
    }
    if (e.target) e.target.value = '';
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== indexToRemove));
    setAttachmentsChanged(true);
  };

  // Sends the current prompt and draft content so Sarvam can write or revise both fields.
  const handleGenerateEmail = async () => {
    if (!aiPrompt.trim()) {
      setErrorMsg('Describe the email you want to write or how you want to update it.');
      return;
    }
    setGeneratingEmail(true);
    setErrorMsg(null);
    try {
      const generated = await api.generateEmailDraft({ prompt: aiPrompt.trim(), subject, textBody: body });
      setSubject(generated.subject);
      setBody(generated.textBody);
    } catch (reason) {
      setErrorMsg(reason instanceof Error ? reason.message : 'Could not generate the email.');
    } finally {
      setGeneratingEmail(false);
    }
  };

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
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
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
      return `${phoneDigits}@${parts[1] || mailDomain}`;
    }
    const raw10 = clean.replace(/\D/g, '').slice(-10);
    return raw10 ? `${raw10}@${mailDomain}` : clean;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTo = normalizeToAddress(toInput);
    if (!finalTo.endsWith(`@${mailDomain}`)) {
      setErrorMsg(`Recipient must be an existing Syscall address, such as 9876543210@${mailDomain}.`);
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Please enter a subject.');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    try {
      if (scheduledAt) {
        if (replyToId || draftId) throw new Error('Save or send this reply/draft before scheduling it.');
        const scheduleDate = new Date(scheduledAt);
        if (!Number.isFinite(scheduleDate.getTime()) || scheduleDate.getTime() <= Date.now()) throw new Error('Choose a future delivery time.');
        await onSchedule({ to: finalTo, subject, textBody: body, scheduledAt: scheduleDate.toISOString(), attachments: attachmentsChanged ? attachments : undefined });
      } else {
        await onSent({ to: finalTo, subject, textBody: body, attachments: attachmentsChanged ? attachments : undefined, replyToId, draftId });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch email.');
    } finally {
      setSending(false);
    }
  };

  // Saves current compose content and attachments as a durable backend draft.
  const handleSaveDraft = async () => {
    setSending(true);
    setErrorMsg(null);
    try {
      await onSaveDraft({ to: toInput.trim(), subject, textBody: body, attachments: attachmentsChanged ? attachments : undefined, draftId });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save draft.');
    } finally {
      setSending(false);
    }
  };

  // Downloads an existing saved-draft attachment without exposing its storage key.
  const handleDownloadDraftAttachment = async (index: number): Promise<void> => {
    if (!draftId) return;
    try {
      const downloaded = await api.downloadAttachment('draft', draftId, index);
      const url = URL.createObjectURL(downloaded.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloaded.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setErrorMsg(reason instanceof Error ? reason.message : 'Could not download draft attachment.');
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
    <>
      {!isMinimized && <button
        type="button"
        className="compose-mobile-backdrop"
        aria-label="Close compose window"
        onClick={onClose}
      />}
      <div style={dockStyle} className={`syscall-compose-modal animate-fade-in ${isMinimized ? 'is-minimized' : ''}`}>
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
        <div style={styles.contentWrap} className="compose-content-wrap no-scrollbar">
          {errorMsg && (
            <div style={styles.errorBox}>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSend} style={styles.form} className="compose-form">
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
                  <span style={styles.domainTag}>@{mailDomain}</span>
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
                disabled={generatingEmail}
              />
            </div>

            {/* One-line AI prompt with the Sarvam action at its trailing edge. */}
            <div style={styles.aiPromptRow}>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleGenerateEmail();
                  }
                }}
                placeholder="Describe your message"
                aria-label="Describe your message"
                maxLength={3000}
                style={styles.aiPromptInput}
                disabled={generatingEmail || sending}
              />
              <button
                type="button"
                onClick={() => void handleGenerateEmail()}
                title={generatingEmail ? 'Writing with Sarvam 105B' : 'Write or update subject and message with Sarvam 105B'}
                aria-label={generatingEmail ? 'Writing with Sarvam 105B' : 'Write or update with Sarvam 105B'}
                aria-busy={generatingEmail}
                style={{
                  ...styles.aiComposeButton,
                  opacity: generatingEmail || sending || !aiPrompt.trim() ? 0.55 : 1,
                  cursor: generatingEmail || sending || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                }}
                disabled={generatingEmail || sending || !aiPrompt.trim()}
              >
                <IconSarvamAI size={20} />
              </button>
            </div>

            {/* Body: Scrollable section with turned-off scrollbar visibility and no extending resize */}
            <div style={styles.bodyWrapper} className="compose-body-wrapper">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email here..."
                style={styles.bodyTextarea}
                className="compose-body-textarea no-scrollbar"
                rows={7}
                disabled={generatingEmail}
              />
            </div>

            {/* Attachments and scheduling follow the message content. */}
            <div style={styles.composeToolbarRow} className="compose-toolbar-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="compose-attach-btn"
                  title="Attach files from computer"
                >
                  <IconAttach size={16} color="#444746" />
                  <span>Attach files</span>
                </button>

                {!replyToId && !draftId && (
                  <button
                    type="button"
                    onClick={() => setShowSchedulePicker(!showSchedulePicker)}
                    className="compose-attach-btn"
                    style={
                      scheduledAt || showSchedulePicker
                        ? { backgroundColor: '#EAF1FB', borderColor: '#A8C7FA', color: '#0B57D0' }
                        : {}
                    }
                    title="Schedule send for a specific date and time"
                  >
                    <IconScheduled
                      size={16}
                      color={scheduledAt || showSchedulePicker ? '#0B57D0' : '#444746'}
                    />
                    <span>{scheduledAt ? 'Scheduled' : 'Schedule send'}</span>
                  </button>
                )}
              </div>

              {(attachments.length > 0 || (!attachmentsChanged && initialAttachments.length > 0)) && (
                <span style={{ fontSize: 11.5, color: '#5E6674', fontWeight: 500 }}>
                  {attachmentsChanged ? attachments.length : initialAttachments.length} file(s)
                </span>
              )}
            </div>

            {/* Attachment Chips Display */}
            {(attachments.length > 0 || (!attachmentsChanged && initialAttachments.length > 0)) && (
              <div className="compose-files-grid">
                {!attachmentsChanged &&
                  initialAttachments.map((file, index) => (
                    <button
                      key={`draft-file-${index}`}
                      type="button"
                      onClick={() => void handleDownloadDraftAttachment(index)}
                      className="compose-draft-chip"
                      title="Download saved draft attachment"
                    >
                      <IconAttach size={13} color="#0B57D0" />
                      <span className="compose-file-chip-name">{file.filename}</span>
                      <span className="compose-file-chip-size">
                        {(file.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </button>
                  ))}

                {attachments.map((file, index) => (
                  <div key={`new-file-${index}`} className="compose-file-chip">
                    <IconAttach size={13} color="#0B57D0" />
                    <span className="compose-file-chip-name" title={file.name}>{file.name}</span>
                    <span className="compose-file-chip-size">{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="compose-file-chip-remove"
                      title="Remove attachment"
                    >
                      <IconClose size={12} color="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Modern Flatpickr Schedule Picker */}
            {!replyToId && !draftId && (showSchedulePicker || scheduledAt) && (
              <ModernSchedulePicker
                scheduledAt={scheduledAt}
                onScheduleChange={setScheduledAt}
                onClear={() => {
                  setScheduledAt('');
                  setShowSchedulePicker(false);
                }}
                autoOpen={!scheduledAt}
                disabled={sending || generatingEmail}
              />
            )}

            {/* Actions: Discard with Shield Tooltip next to it, and Send Syscall button */}
            <div style={styles.actionRow} className="compose-action-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={onClose} style={styles.cancelBtn}>
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveDraft()}
                  style={styles.cancelBtn}
                  disabled={sending || generatingEmail}
                >
                  Save draft
                </button>
                <span
                  title="Protected by ClamAV real-time antivirus scan"
                  data-tooltip="Protected by ClamAV real-time antivirus scan"
                  style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
                >
                  <IconShieldCheck size={18} color="#146C2E" />
                </span>
              </div>

              <button type="submit" disabled={sending || generatingEmail} style={styles.sendBtn}>
                {scheduledAt ? (
                  <IconScheduled size={15} color="#FFFFFF" />
                ) : (
                  <IconSent size={15} color="#FFFFFF" />
                )}
                <span>
                  {sending
                    ? 'Queueing...'
                    : scheduledAt
                    ? 'Schedule Syscall'
                    : 'Send Syscall'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  floatingDock: {
    position: 'fixed',
    bottom: '16px',
    right: '80px',
    width: '540px',
    maxWidth: 'calc(100vw - 24px)',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1100,
    overflow: 'hidden',
  },
  minimizedDock: {
    position: 'fixed',
    bottom: '16px',
    right: '80px',
    width: '260px',
    height: '42px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
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
  aiPromptRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '40px',
    minHeight: '40px',
    maxHeight: '40px',
    flexShrink: 0,
    borderBottom: '1px solid #E0E2EC',
    overflow: 'hidden',
  },
  aiPromptInput: {
    flex: 1,
    minWidth: 0,
    height: '36px',
    minHeight: '36px',
    maxHeight: '36px',
    border: 'none',
    padding: '0 4px 0 0',
    background: 'transparent',
    color: '#1F1F1F',
    fontFamily: 'inherit',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  },
  aiComposeButton: {
    width: '32px',
    height: '32px',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
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
  composeToolbarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0 4px 0',
    borderTop: '1px solid #F1F3F4',
    marginTop: '4px',
  },
};
