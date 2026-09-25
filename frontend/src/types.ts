export interface User {
  id: string;
  phone: string;
  emailAddress: string;
  name?: string;
  avatarUrl?: string;
  passwordConfigured: boolean;
  accountStatus: 'active' | 'disabled';
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
}

export interface Draft {
  publicId: string;
  recipientAddress: string | null;
  subject: string;
  textBody: string;
  updatedAt: string;
}

export interface HealthState {
  ready: boolean;
  mongodb: boolean;
  redis: boolean;
  clamav: boolean;
  telnyxConfigured: boolean;
  apiPort: number;
}

// Helper to compute initials: first letter of name + first letter of surname (e.g. Akshat Joshi -> AJ)
export const getInitials = (name?: string, fallback = 'AJ'): string => {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
