import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Email } from '../types';
import { api, createWelcomeEmail } from '../api';
import type { TabCategory } from '../components/mail/CategoryTabs';

interface MailContextType {
  currentUser: User;
  emails: Email[];
  starredIds: Set<string>;
  trashIds: Set<string>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isComposeOpen: boolean;
  setIsComposeOpen: (open: boolean) => void;
  composePrefill: { to?: string; subject?: string } | null;
  setComposePrefill: (prefill: { to?: string; subject?: string } | null) => void;
  categoryTab: TabCategory;
  setCategoryTab: (tab: TabCategory) => void;
  refreshing: boolean;
  loadMail: () => Promise<void>;
  handleMoveToBin: (id: string) => void;
  handleRestoreFromBin: (id: string) => void;
  handlePermanentDelete: (id: string) => void;
  handleEmptyBin: () => void;
  handleToggleStar: (id: string, e?: React.MouseEvent) => void;
  handleSendMail: (to: string, subject: string, body: string, attachments?: File[]) => Promise<void>;
  handleUpdateName: (newName: string) => void;
  handleUpdatePhoto: (photoUrl: string) => void;
  handleSignOut: () => void;
}

const MailContext = createContext<MailContextType | null>(null);

export const useMail = () => {
  const context = useContext(MailContext);
  if (!context) {
    throw new Error('useMail must be used within a MailProvider');
  }
  return context;
};

interface MailProviderProps {
  initialUser: User;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const MailProvider: React.FC<MailProviderProps> = ({
  initialUser,
  onSignOut,
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedName = localStorage.getItem(`syscall_name_${initialUser.phone}`);
    const savedAvatar = localStorage.getItem(`syscall_avatar_${initialUser.phone}`);
    return {
      ...initialUser,
      name: savedName || initialUser.name || 'Akshat Joshi',
      avatarUrl: savedAvatar || initialUser.avatarUrl,
    };
  });

  const [emails, setEmails] = useState<Email[]>(() => {
    const local = localStorage.getItem(`syscall_emails_${initialUser.phone}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }
    const welcome = createWelcomeEmail(initialUser.phone);
    return [welcome];
  });

  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    const local = localStorage.getItem(`syscall_starred_${initialUser.phone}`);
    if (local) {
      try {
        return new Set(JSON.parse(local));
      } catch {}
    }
    return new Set<string>();
  });

  const [trashIds, setTrashIds] = useState<Set<string>>(() => {
    const local = localStorage.getItem(`syscall_bin_${initialUser.phone}`) || localStorage.getItem(`syscall_trash_${initialUser.phone}`);
    if (local) {
      try {
        return new Set(JSON.parse(local));
      } catch {}
    }
    return new Set<string>();
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryTab, setCategoryTab] = useState<TabCategory>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composePrefill, setComposePrefill] = useState<{ to?: string; subject?: string } | null>(null);

  const loadMail = useCallback(async () => {
    setRefreshing(true);
    try {
      const remote = await api.getMail(currentUser.phone);
      if (remote && remote.length > 0) {
        setEmails((prev) => {
          const map = new Map(prev.map((e) => [e.publicId, e]));
          for (const m of remote) {
            map.set(m.publicId, m);
          }
          const merged = Array.from(map.values());
          localStorage.setItem(`syscall_emails_${currentUser.phone}`, JSON.stringify(merged));
          return merged;
        });
      }
    } catch {
      // Keep existing data
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [currentUser.phone]);

  useEffect(() => {
    loadMail();
  }, [loadMail]);

  const handleMoveToBin = useCallback((mailId: string) => {
    setTrashIds((prev) => {
      const next = new Set(prev);
      next.add(mailId);
      localStorage.setItem(`syscall_bin_${currentUser.phone}`, JSON.stringify([...next]));
      localStorage.setItem(`syscall_trash_${currentUser.phone}`, JSON.stringify([...next]));
      return next;
    });
  }, [currentUser.phone]);

  const handleRestoreFromBin = useCallback((mailId: string) => {
    setTrashIds((prev) => {
      const next = new Set(prev);
      next.delete(mailId);
      localStorage.setItem(`syscall_bin_${currentUser.phone}`, JSON.stringify([...next]));
      localStorage.setItem(`syscall_trash_${currentUser.phone}`, JSON.stringify([...next]));
      return next;
    });
  }, [currentUser.phone]);

  const handlePermanentDelete = useCallback((mailId: string) => {
    setEmails((prev) => {
      const updated = prev.filter((m) => m.publicId !== mailId);
      localStorage.setItem(`syscall_emails_${currentUser.phone}`, JSON.stringify(updated));
      return updated;
    });
    setTrashIds((prev) => {
      const next = new Set(prev);
      next.delete(mailId);
      localStorage.setItem(`syscall_bin_${currentUser.phone}`, JSON.stringify([...next]));
      localStorage.setItem(`syscall_trash_${currentUser.phone}`, JSON.stringify([...next]));
      return next;
    });
  }, [currentUser.phone]);

  const handleEmptyBin = useCallback(() => {
    setEmails((prev) => {
      const updated = prev.filter((m) => !trashIds.has(m.publicId));
      localStorage.setItem(`syscall_emails_${currentUser.phone}`, JSON.stringify(updated));
      return updated;
    });
    setTrashIds(new Set());
    localStorage.removeItem(`syscall_bin_${currentUser.phone}`);
    localStorage.removeItem(`syscall_trash_${currentUser.phone}`);
  }, [currentUser.phone, trashIds]);

  const handleToggleStar = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(`syscall_starred_${currentUser.phone}`, JSON.stringify([...next]));
      return next;
    });
  }, [currentUser.phone]);

  const handleSendMail = useCallback(async (
    to: string,
    subject: string,
    body: string,
    attachments?: File[]
  ) => {
    const rawTo10 = to.replace(/@.*$/, '').replace(/\D/g, '').slice(-10);
    const destinationAddress = `${rawTo10}@niti`;
    const cleanSubject = subject.trim() || '(No Subject)';
    const nowIso = new Date().toISOString();

    const mockAttachments = attachments?.map((f) => ({
      filename: f.name,
      contentType: f.type || 'application/octet-stream',
      sizeBytes: f.size,
      clamavStatus: 'clean' as const,
    })) || [];

    const newSentEmail: Email = {
      publicId: `sent-${Date.now()}`,
      senderAddress: currentUser.emailAddress,
      recipientAddress: destinationAddress,
      subject: cleanSubject,
      textBody: body,
      createdAt: nowIso,
      readAt: nowIso,
      isSpam: false,
      attachments: mockAttachments,
    };

    setEmails((prev) => {
      const updated = [newSentEmail, ...prev];
      localStorage.setItem(`syscall_emails_${currentUser.phone}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await api.sendMail(destinationAddress, cleanSubject, body);
    } catch {
      // Local copy saved
    }
  }, [currentUser]);

  const handleUpdateName = useCallback((newName: string) => {
    setCurrentUser((prev) => ({ ...prev, name: newName }));
    localStorage.setItem(`syscall_name_${currentUser.phone}`, newName);
  }, [currentUser.phone]);

  const handleUpdatePhoto = useCallback((photoUrl: string) => {
    setCurrentUser((prev) => ({ ...prev, avatarUrl: photoUrl }));
    try {
      localStorage.setItem(`syscall_avatar_${currentUser.phone}`, photoUrl);
    } catch {
      // LocalStorage quota safety
    }
  }, [currentUser.phone]);

  return (
    <MailContext.Provider
      value={{
        currentUser,
        emails,
        starredIds,
        trashIds,
        searchQuery,
        setSearchQuery,
        isDrawerOpen,
        setIsDrawerOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isComposeOpen,
        setIsComposeOpen,
        composePrefill,
        setComposePrefill,
        categoryTab,
        setCategoryTab,
        refreshing,
        loadMail,
        handleMoveToBin,
        handleRestoreFromBin,
        handlePermanentDelete,
        handleEmptyBin,
        handleToggleStar,
        handleSendMail,
        handleUpdateName,
        handleUpdatePhoto,
        handleSignOut: onSignOut,
      }}
    >
      {children}
    </MailContext.Provider>
  );
};
