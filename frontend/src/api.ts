/**
 * File: api.ts
 * Role: Provides typed, authenticated HTTP access to the Syscall backend.
 * Service: Frontend.
 */
import type { Draft, Email, HealthState, User } from './types';

interface AuthResult {
  sessionToken: string;
  user: User;
  requiresPassword?: boolean;
}

class SyscallApi {
  private sessionToken: string | null = sessionStorage.getItem('syscall_session_token');

  // Stores the short-lived browser session token without persisting credentials.
  setSession(token: string | null): void {
    this.sessionToken = token;
    if (token) sessionStorage.setItem('syscall_session_token', token);
    else sessionStorage.removeItem('syscall_session_token');
  }

  // Returns the current in-tab session token for session restoration.
  getSession(): string | null {
    return this.sessionToken;
  }

  // Builds JSON headers and includes the backend session token when present.
  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionToken) headers['X-Session-Token'] = this.sessionToken;
    return headers;
  }

  // Sends an API request and surfaces backend errors instead of substituting demo state.
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(path, { ...init, headers: { ...this.headers(), ...init.headers } });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (response.status === 401 && this.sessionToken) {
      this.setSession(null);
      window.dispatchEvent(new Event('syscall:session-invalid'));
    }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data as T;
  }

  // Requests a voice-led browser signup after collecting and validating the caller name.
  async requestAccountCall(phone: string, name: string): Promise<{ status: string; callControlId: string }> {
    return this.request('/api/onboarding/call-request', { method: 'POST', body: JSON.stringify({ phone, name }) });
  }

  // Starts an outbound test call to the IVR gateway.
  async startOutboundCall(phoneE164: string): Promise<{ status: string; callControlId?: string }> {
    return this.request('/calls/start', { method: 'POST', body: JSON.stringify({ phone: phoneE164 }) });
  }

  // Verifies an existing account's password and creates a real backend session.
  async loginWithPassword(phone: string, password: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>('/api/auth/password/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
    this.setSession(result.sessionToken);
    return result;
  }

  // Requests a backend OTP for an existing account and retrieves public preview data if existing.
  async requestOtp(phone: string): Promise<{ status: string; cooldownSeconds?: number; user?: { name: string; avatarUrl: string | null } | null }> {
    return this.request('/api/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
  }

  // Previews an account's public name and avatar prior to sign in.
  async previewPhone(phone: string): Promise<{ exists: boolean; user?: { name: string; avatarUrl: string | null } | null }> {
    return this.request('/api/auth/preview', { method: 'POST', body: JSON.stringify({ phone }) });
  }

  // Verifies an existing-account OTP and stores the returned session token.
  async verifyOtp(phone: string, otp: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, otp }) });
    this.setSession(result.sessionToken);
    return result;
  }

  // Persists a password for a signed-in account that has not set one yet.
  async setPassword(password: string): Promise<{ user: User }> {
    return this.request('/api/auth/password/set', { method: 'POST', body: JSON.stringify({ password }) });
  }

  // Requests a password reset without exposing account existence to the browser.
  async requestPasswordReset(phone: string): Promise<{ status: string }> {
    return this.request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ phone }) });
  }

  // Replaces a password with a one-time, backend-issued reset token.
  async resetPassword(token: string, password: string): Promise<void> {
    await this.request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
  }

  // Revokes the current backend session and clears its browser token.
  async logout(): Promise<void> {
    try { await this.request('/api/auth/logout', { method: 'POST' }); }
    finally { this.setSession(null); }
  }

  // Restores the account bound to the current session from the backend.
  async getMe(): Promise<User> {
    const result = await this.request<{ user: User }>('/api/auth/me');
    return result.user;
  }

  // Fetches current mailbox messages from the backend.
  async getMail(): Promise<Email[]> {
    return this.request('/api/mail');
  }

  // Fetches the authenticated participant's recoverable trash.
  async getTrash(): Promise<Email[]> {
    return this.request('/api/mail/trash');
  }

  // Fetches one message and marks it read when the account is its recipient.
  async getEmail(publicId: string): Promise<Email> {
    return this.request(`/api/mail/${encodeURIComponent(publicId)}`);
  }

  // Converts browser files to validated JSON attachment payloads for the API.
  private async encodeAttachments(files: File[] = []): Promise<Array<{ filename: string; contentType: string; contentBase64: string }>> {
    return Promise.all(files.map(async (file) => ({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      contentBase64: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error(`Could not read attachment ${file.name}.`));
        reader.readAsDataURL(file);
      }),
    })));
  }

  // Queues a new email and its optional uploaded attachments.
  async sendMail(to: string, subject: string, textBody: string, attachments: File[] = []): Promise<{ publicId: string }> {
    return this.request('/api/mail/send', { method: 'POST', body: JSON.stringify({ to, subject, textBody, attachments: await this.encodeAttachments(attachments) }) });
  }

  // Queues a server-threaded reply to a message.
  async replyToEmail(publicId: string, textBody: string, attachments: File[] = []): Promise<{ publicId: string }> {
    return this.request(`/api/mail/${encodeURIComponent(publicId)}/reply`, { method: 'POST', body: JSON.stringify({ textBody, attachments: await this.encodeAttachments(attachments) }) });
  }

  // Moves the current participant's message copy to recoverable trash.
  async trashEmail(publicId: string): Promise<void> {
    await this.request(`/api/mail/${encodeURIComponent(publicId)}`, { method: 'DELETE' });
  }

  // Restores a trashed message for this participant.
  async restoreEmail(publicId: string): Promise<void> {
    await this.request(`/api/mail/${encodeURIComponent(publicId)}/restore`, { method: 'POST' });
  }

  // Permanently deletes a trashed message for this participant.
  async permanentlyDeleteEmail(publicId: string): Promise<void> {
    await this.request(`/api/mail/${encodeURIComponent(publicId)}/permanent`, { method: 'DELETE' });
  }

  // Permanently deletes all messages currently in this participant's trash.
  async emptyTrash(): Promise<void> {
    await this.request('/api/mail/trash', { method: 'DELETE' });
  }

  // Stores or clears the authenticated participant's star on a message.
  async setStar(publicId: string, starred: boolean): Promise<void> {
    await this.request(`/api/mail/${encodeURIComponent(publicId)}/star`, { method: starred ? 'PUT' : 'DELETE' });
  }

  // Marks or clears the recipient's spam classification for one message.
  async setSpam(publicId: string, spam: boolean): Promise<void> {
    await this.request(`/api/mail/${encodeURIComponent(publicId)}/spam`, { method: spam ? 'POST' : 'DELETE' });
  }

  // Fetches the user's server-owned draft list.
  async getDrafts(): Promise<Draft[]> {
    return this.request('/api/drafts');
  }

  // Creates a draft including any uploaded attachments.
  async createDraft(draft: Partial<Draft>, attachments: File[] = []): Promise<{ publicId: string }> {
    return this.request('/api/drafts', { method: 'POST', body: JSON.stringify({ to: draft.recipientAddress, subject: draft.subject ?? '', textBody: draft.textBody ?? '', attachments: await this.encodeAttachments(attachments) }) });
  }

  // Updates a server-owned draft's editable fields.
  async getDraft(publicId: string): Promise<Draft> {
    return this.request(`/api/drafts/${encodeURIComponent(publicId)}`);
  }

  // Updates a server-owned draft and optionally replaces its uploaded files.
  async updateDraft(publicId: string, draft: Partial<Draft>, attachments?: File[]): Promise<Draft> {
    const files = attachments === undefined ? undefined : await this.encodeAttachments(attachments);
    return this.request(`/api/drafts/${encodeURIComponent(publicId)}`, { method: 'PATCH', body: JSON.stringify({ to: draft.recipientAddress, subject: draft.subject, textBody: draft.textBody, ...(files === undefined ? {} : { attachments: files }) }) });
  }

  // Deletes a server-owned draft.
  async deleteDraft(publicId: string): Promise<void> {
    await this.request(`/api/drafts/${encodeURIComponent(publicId)}`, { method: 'DELETE' });
  }

  // Queues delivery of a complete server-owned draft.
  async sendDraft(publicId: string): Promise<void> {
    await this.request(`/api/drafts/${encodeURIComponent(publicId)}/send`, { method: 'POST' });
  }

  // Fetches pending scheduled messages belonging to the current sender.
  async getScheduled(): Promise<Email[]> {
    return this.request('/api/mail/scheduled');
  }

  // Creates a scheduled message with server-calculated delivery time.
  async scheduleMail(input: { to: string; subject: string; textBody: string; scheduledAt: string; attachments?: File[] }): Promise<{ publicId: string }> {
    return this.request('/api/mail/scheduled', { method: 'POST', body: JSON.stringify({ ...input, attachments: await this.encodeAttachments(input.attachments) }) });
  }

  // Changes the time for an existing pending scheduled message.
  async rescheduleMail(publicId: string, scheduledAt: string): Promise<void> {
    await this.request(`/api/mail/scheduled/${encodeURIComponent(publicId)}`, { method: 'PATCH', body: JSON.stringify({ scheduledAt }) });
  }

  // Cancels delivery of a pending scheduled message.
  async cancelScheduledMail(publicId: string): Promise<void> {
    await this.request(`/api/mail/scheduled/${encodeURIComponent(publicId)}`, { method: 'DELETE' });
  }

  // Loads profile data from server-side persistence.
  async getProfile(): Promise<{ name: string; avatarUrl: string | null }> {
    return this.request('/api/profile');
  }

  // Saves a name and optional JPEG data to the authenticated profile.
  async updateProfile(input: { name?: string; avatarBase64?: string }): Promise<{ name: string; avatarAvailable: boolean }> {
    return this.request('/api/profile', { method: 'PATCH', body: JSON.stringify(input) });
  }

  // Downloads an authenticated email or draft attachment as a browser Blob.
  async downloadAttachment(kind: 'mail' | 'draft', publicId: string, index: number): Promise<{ blob: Blob; filename: string }> {
    const path = kind === 'mail' ? `/api/mail/${encodeURIComponent(publicId)}/attachments/${index}` : `/api/drafts/${encodeURIComponent(publicId)}/attachments/${index}`;
    const result = await this.request<{ filename: string; contentType: string; contentBase64: string }>(path);
    const bytes = Uint8Array.from(atob(result.contentBase64), (character) => character.charCodeAt(0));
    return { blob: new Blob([bytes], { type: result.contentType }), filename: result.filename };
  }

  // Reads backend health without inventing an offline success state.
  async checkHealth(): Promise<HealthState> {
    const response = await fetch('/ready');
    const data = await response.json() as { status: string; dependencies?: Record<string, boolean> };
    return { ready: data.status === 'ready', mongodb: data.dependencies?.mongodb ?? false, redis: data.dependencies?.redis ?? false, clamav: data.dependencies?.clamav ?? false, telnyxConfigured: data.dependencies?.telnyxConfigured ?? false, apiPort: 3000 };
  }
}

export const api = new SyscallApi();
