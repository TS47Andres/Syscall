export interface User {
  id: string;
  phone: string;
  emailAddress: string;
  name?: string;
  avatarUrl?: string | null;
  passwordConfigured: boolean;
  accountStatus: 'active' | 'disabled';
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  dateOfBirth?: string | null;
  language?: string;
}

export interface Attachment {
  filename: string;
  contentType: string;
  sizeBytes: number;
  uri?: string;
}

export interface Email {
  publicId: string;
  senderAddress: string;
  recipientAddress: string;
  senderName?: string;
  recipientName?: string;
  isSender?: boolean;
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
  isImportant?: boolean;
}

export interface Draft {
  publicId: string;
  recipientAddress: string | null;
  subject: string;
  textBody: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export type FolderId = 'inbox' | 'sent' | 'allmail' | 'starred' | 'snoozed' | 'important' | 'scheduled' | 'drafts' | 'promotions' | 'social' | 'purchases' | 'updates' | 'spam' | 'trash';

export const getInitials = (name?: string, fallback = 'SY'): string => {
  if (!name?.trim()) return fallback;
  const words = name.trim().split(/\s+/);
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export const folderLabels: Record<FolderId, string> = {
  inbox: 'Inbox', sent: 'Sent', allmail: 'All mail', starred: 'Starred', snoozed: 'Snoozed', important: 'Important',
  scheduled: 'Scheduled', drafts: 'Drafts', promotions: 'Promotions', social: 'Social', purchases: 'Purchases', updates: 'Updates', spam: 'Spam', trash: 'Trash',
};

export const folders: FolderId[] = ['inbox', 'sent', 'allmail', 'starred', 'snoozed', 'important', 'scheduled', 'drafts', 'promotions', 'social', 'purchases', 'updates', 'spam', 'trash'];
