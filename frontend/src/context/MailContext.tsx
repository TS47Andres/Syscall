/**
 * File: MailContext.tsx
 * Role: Loads and mutates authenticated mailbox state through backend APIs.
 * Service: Frontend.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Email, Draft, Attachment } from '../types';
import { api } from '../api';
import type { TabCategory } from '../components/mail/CategoryTabs';

interface MailContextType {
  currentUser: User;
  emails: Email[];
  starredIds: Set<string>;
  trashIds: Set<string>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isComposeOpen: boolean;
  setIsComposeOpen: (open: boolean) => void;
  composePrefill: { to?: string; subject?: string; body?: string; replyToId?: string; draftId?: string; draftAttachments?: Attachment[] } | null;
  setComposePrefill: (prefill: { to?: string; subject?: string; body?: string; replyToId?: string; draftId?: string; draftAttachments?: Attachment[] } | null) => void;
  categoryTab: TabCategory;
  setCategoryTab: (tab: TabCategory) => void;
  refreshing: boolean;
  loadError: string | null;
  loadMail: () => Promise<void>;
  handleMoveToBin: (id: string) => void;
  handleRestoreFromBin: (id: string) => void;
  handlePermanentDelete: (id: string) => void;
  handleEmptyBin: () => void;
  handleToggleStar: (id: string, event?: React.MouseEvent) => void;
  handleToggleSpam: (id: string, spam: boolean) => void;
  handleSendMail: (to: string, subject: string, body: string, attachments?: File[], replyToId?: string, draftId?: string) => Promise<void>;
  handleSaveDraft: (to: string, subject: string, body: string, attachments?: File[], draftId?: string) => Promise<void>;
  handleScheduleMail: (to: string, subject: string, body: string, scheduledAt: string, attachments?: File[]) => Promise<void>;
  handleCancelScheduled: (id: string) => Promise<void>;
  handleRescheduleScheduled: (id: string, scheduledAt: string) => Promise<void>;
  handleUpdateName: (newName: string) => Promise<void>;
  handleUpdatePhoto: (photoUrl: string) => Promise<void>;
  handleSignOut: () => void;
}

const MailContext = createContext<MailContextType | null>(null);

// Returns mailbox context only when its authenticated provider is present.
export function useMail(): MailContextType {
  const context = useContext(MailContext);
  if (!context) throw new Error('useMail must be used within a MailProvider');
  return context;
}

interface MailProviderProps {
  initialUser: User;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const MailProvider: React.FC<MailProviderProps> = ({ initialUser, onSignOut, children }) => {
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [emails, setEmails] = useState<Email[]>([]);
  const [trashIds, setTrashIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTab, setCategoryTab] = useState<TabCategory>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composePrefill, setComposePrefill] = useState<{ to?: string; subject?: string; body?: string; replyToId?: string; draftId?: string; draftAttachments?: Attachment[] } | null>(null);

  // Replaces all mailbox collections with authoritative backend responses.
  const loadMail = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const [mail, trash, drafts, scheduled] = await Promise.all([api.getMail(), api.getTrash(), api.getDrafts(), api.getScheduled()]);
      const trashed = trash.map((message) => ({ ...message, isTrashed: true }));
      const draftMessages: Email[] = drafts.map((draft: Draft) => ({
        publicId: draft.publicId,
        senderAddress: currentUser.emailAddress,
        recipientAddress: draft.recipientAddress ?? '',
        subject: draft.subject,
        textBody: draft.textBody,
        createdAt: draft.updatedAt,
        readAt: draft.updatedAt,
        isSpam: false,
        isDraft: true,
        attachments: draft.attachments,
      }));
      const scheduledMessages: Email[] = scheduled.map((email) => ({
        ...email,
        senderAddress: currentUser.emailAddress,
        textBody: email.textBody ?? '',
        readAt: email.createdAt,
        isSpam: false,
        deliveryStatus: 'scheduled',
      }));
      const combined = [...mail, ...trashed, ...draftMessages, ...scheduledMessages];
      setEmails(combined);
      setTrashIds(new Set(trashed.map((email) => email.publicId)));
      setStarredIds(new Set(combined.filter((email) => email.isStarred).map((email) => email.publicId)));
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : 'Could not load mailbox data.');
      throw reason;
    } finally {
      setRefreshing(false);
    }
  }, [currentUser.emailAddress]);

  useEffect(() => { void loadMail().catch(() => undefined); }, [loadMail]);

  useEffect(() => {
    let cancelled = false;
    void api.getProfile().then((profile) => {
      if (!cancelled) setCurrentUser((user) => ({ ...user, name: profile.name || user.name, avatarUrl: profile.avatarUrl || undefined }));
    }).catch((reason: unknown) => {
      if (!cancelled) setLoadError(reason instanceof Error ? reason.message : 'Could not load profile.');
    });
    return () => { cancelled = true; };
  }, []);

  // Moves one message to backend-owned recoverable trash, then refreshes visible folders.
  const handleMoveToBin = useCallback((id: string): void => { void api.trashEmail(id).then(loadMail).catch((reason) => setLoadError(reason instanceof Error ? reason.message : 'Could not move message to trash.')); }, [loadMail]);
  // Restores one trashed message through the backend.
  const handleRestoreFromBin = useCallback((id: string): void => { void api.restoreEmail(id).then(loadMail).catch((reason) => setLoadError(reason instanceof Error ? reason.message : 'Could not restore message.')); }, [loadMail]);
  // Permanently deletes the current participant's trashed copy.
  const handlePermanentDelete = useCallback((id: string): void => { void api.permanentlyDeleteEmail(id).then(loadMail).catch((reason) => setLoadError(reason instanceof Error ? reason.message : 'Could not permanently delete message.')); }, [loadMail]);
  // Permanently deletes all messages in this participant's backend trash.
  const handleEmptyBin = useCallback((): void => { void api.emptyTrash().then(loadMail).catch((reason) => setLoadError(reason instanceof Error ? reason.message : 'Could not empty trash.')); }, [loadMail]);
  // Persists the participant-specific star state.
  const handleToggleStar = useCallback((id: string, event?: React.MouseEvent): void => {
    event?.stopPropagation();
    const starred = !starredIds.has(id);
    void api.setStar(id, starred).then(loadMail).catch((reason) => setLoadError(reason instanceof Error ? reason.message : 'Could not update star.'));
  }, [loadMail, starredIds]);

  // Persists recipient-owned spam classification and reloads affected folders.
  const handleToggleSpam = useCallback((id: string, spam: boolean): void => { void api.setSpam(id, spam).then(loadMail).catch((reason) => setLoadError(reason instanceof Error ? reason.message : 'Could not update spam status.')); }, [loadMail]);

  // Queues a real message or threaded reply, then reloads mailbox state.
  const handleSendMail = useCallback(async (to: string, subject: string, body: string, attachments?: File[], replyToId?: string, draftId?: string): Promise<void> => {
    if (draftId) { await api.updateDraft(draftId, { recipientAddress: to, subject, textBody: body }, attachments); await api.sendDraft(draftId); }
    else if (replyToId) await api.replyToEmail(replyToId, body, attachments ?? []);
    else await api.sendMail(to, subject, body, attachments ?? []);
    await loadMail();
  }, [loadMail]);

  // Creates or updates a durable backend draft with all compose fields and attachments.
  const handleSaveDraft = useCallback(async (to: string, subject: string, body: string, attachments?: File[], draftId?: string): Promise<void> => {
    if (draftId) await api.updateDraft(draftId, { recipientAddress: to || null, subject, textBody: body }, attachments);
    else await api.createDraft({ recipientAddress: to || null, subject, textBody: body }, attachments ?? []);
    await loadMail();
  }, [loadMail]);

  // Schedules a complete message through the durable backend scheduler.
  const handleScheduleMail = useCallback(async (to: string, subject: string, body: string, scheduledAt: string, attachments?: File[]): Promise<void> => {
    await api.scheduleMail({ to, subject, textBody: body, scheduledAt, attachments });
    await loadMail();
  }, [loadMail]);

  // Cancels a pending scheduled message through its owner-scoped API.
  const handleCancelScheduled = useCallback(async (id: string): Promise<void> => { await api.cancelScheduledMail(id); await loadMail(); }, [loadMail]);

  // Changes the delivery time of a pending scheduled message.
  const handleRescheduleScheduled = useCallback(async (id: string, scheduledAt: string): Promise<void> => { await api.rescheduleMail(id, scheduledAt); await loadMail(); }, [loadMail]);

  // Saves a profile name on the backend before updating in-memory display state.
  const handleUpdateName = useCallback(async (newName: string): Promise<void> => {
    try { await api.updateProfile({ name: newName }); setCurrentUser((user) => ({ ...user, name: newName })); }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'Could not update name.'; setLoadError(message); throw new Error(message); }
  }, []);

  // Saves a JPEG data URL through the authenticated profile API.
  const handleUpdatePhoto = useCallback(async (photoUrl: string): Promise<void> => {
    const avatarBase64 = photoUrl.split(',')[1];
    if (!avatarBase64) throw new Error('Profile photo data is invalid.');
    try { await api.updateProfile({ avatarBase64 }); setCurrentUser((user) => ({ ...user, avatarUrl: photoUrl })); }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'Could not update profile photo.'; setLoadError(message); throw new Error(message); }
  }, []);

  return <MailContext.Provider value={{ currentUser, emails, starredIds, trashIds, searchQuery, setSearchQuery, isDrawerOpen, setIsDrawerOpen, isSidebarCollapsed, setIsSidebarCollapsed, isComposeOpen, setIsComposeOpen, composePrefill, setComposePrefill, categoryTab, setCategoryTab, refreshing, loadError, loadMail, handleMoveToBin, handleRestoreFromBin, handlePermanentDelete, handleEmptyBin, handleToggleStar, handleToggleSpam, handleSendMail, handleSaveDraft, handleScheduleMail, handleCancelScheduled, handleRescheduleScheduled, handleUpdateName, handleUpdatePhoto, handleSignOut: onSignOut }}>{children}</MailContext.Provider>;
};
