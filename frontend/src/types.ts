/**
 * File: types.ts
 * Role: Declares frontend DTOs shared by mailbox and authentication views.
 * Service: Frontend.
 */
export interface User {
  id: string;
  phone: string;
  emailAddress: string;
  name?: string;
  avatarUrl?: string;
  passwordConfigured: boolean;
  accountStatus: 'active' | 'disabled';
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  dateOfBirth?: string | null;
  language?: string;
}

export interface EmailSearchFilters {
  query: string;
  from?: string;
  to?: string;
  subject?: string;
  hasWords?: string;
  hasAttachment?: boolean;
  isStarred?: boolean;
  isUnread?: boolean;
  dateRange?: string; // 'all' | '1d' | '3d' | '7d' | '30d' | '1y'
  folderScope?: string; // 'current' | 'all' | 'inbox' | 'sent' | 'drafts' | 'scheduled' | 'trash' | 'spam'
}

export interface Attachment {
  filename: string;
  contentType: string;
  sizeBytes: number;
  clamavStatus?: 'clean' | 'infected' | 'skipped';
}

export interface Email {
  publicId: string;
  senderAddress: string;
  recipientAddress: string;
  subject: string;
  textBody: string;
  htmlBody?: string | null;
  readAt?: string | null;
  isSpam?: boolean;
  createdAt: string;
  attachments?: Attachment[];
  isStarred?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  deliveryStatus?: 'scheduled' | 'queued' | 'delivered' | 'failed' | 'cancelled';
  scheduledAt?: string | null;
  isDraft?: boolean;
  inReplyTo?: string | null;
}

export interface Draft {
  publicId: string;
  recipientAddress: string | null;
  subject: string;
  textBody: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface HealthState {
  ready: boolean;
  mongodb: boolean;
  redis: boolean;
  clamav: boolean;
  telnyxConfigured: boolean;
  apiPort: number;
}

// Computes display initials from a persisted account name.
export const getInitials = (name?: string, fallback = 'SY'): string => {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
