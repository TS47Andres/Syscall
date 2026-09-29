import * as SecureStore from 'expo-secure-store';
import type { Email, User, Draft } from './types';

const apiBase = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const sessionKey = 'syscall_session_token';
let sessionToken: string | null = null;
export interface EncodedAttachment { filename: string; contentType: string; contentBase64: string; }

export async function loadSession() { sessionToken = await SecureStore.getItemAsync(sessionKey); return sessionToken; }
export async function setSession(token: string | null) {
  sessionToken = token;
  if (token) await SecureStore.setItemAsync(sessionKey, token); else await SecureStore.deleteItemAsync(sessionKey);
}

async function request<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (sessionToken) headers.set('X-Session-Token', sessionToken);
  let response: Response;
  try { response = await fetch(`${apiBase}${path}`, { ...init, headers }); }
  catch { throw new Error(`Can't reach Syscall at ${apiBase}. Check EXPO_PUBLIC_API_URL.`); }
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (response.status === 401 && sessionToken) await setSession(null);
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data as T;
}

export const api = {
  requestAccountCall: (phone: string, name: string) => request<{ status: string; callControlId: string }>('/api/onboarding/call-request', { method: 'POST', body: JSON.stringify({ phone, name }) }),
  previewPhone: (phone: string) => request<{ exists: boolean; user?: { name: string; avatarUrl: string | null } | null }>('/api/auth/preview', { method: 'POST', body: JSON.stringify({ phone }) }),
  requestOtp: (phone: string) => request<{ status: string; cooldownSeconds?: number; user?: { name: string; avatarUrl: string | null } | null }>('/api/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: async (phone: string, otp: string) => { const result = await request<{ sessionToken: string; user: User }>('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, otp }) }); await setSession(result.sessionToken); return result; },
  loginWithPassword: async (phone: string, password: string) => { const result = await request<{ sessionToken: string; user: User }>('/api/auth/password/login', { method: 'POST', body: JSON.stringify({ phone, password }) }); await setSession(result.sessionToken); return result; },
  setPassword: (password: string) => request<{ user: User }>('/api/auth/password/set', { method: 'POST', body: JSON.stringify({ password }) }),
  setInitialPassword: (password: string) => request<{ user: User }>('/api/auth/password/initial-set', { method: 'POST', body: JSON.stringify({ password }) }),
  getMe: async () => (await request<{ user: User }>('/api/auth/me')).user,
  logout: async () => { try { await request('/api/auth/logout', { method: 'POST' }); } finally { await setSession(null); } },
  getMail: () => request<Email[]>('/api/mail'),
  getTrash: () => request<Email[]>('/api/mail/trash'),
  getDrafts: () => request<Draft[]>('/api/drafts'),
  getScheduled: () => request<Email[]>('/api/mail/scheduled'),
  getEmail: (id: string) => request<Email>(`/api/mail/${encodeURIComponent(id)}`),
  downloadAttachment: (id: string, index: number) => request<{ filename: string; contentType: string; contentBase64: string }>(`/api/mail/${encodeURIComponent(id)}/attachments/${index}`),
  setStar: (id: string, starred: boolean) => request(`/api/mail/${encodeURIComponent(id)}/star`, { method: starred ? 'PUT' : 'DELETE' }),
  setRead: (id: string, read: boolean) => request(`/api/mail/${encodeURIComponent(id)}/read`, { method: 'PATCH', body: JSON.stringify({ read }) }),
  trashEmail: (id: string) => request(`/api/mail/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  restoreEmail: (id: string) => request(`/api/mail/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  permanentlyDeleteEmail: (id: string) => request(`/api/mail/${encodeURIComponent(id)}/permanent`, { method: 'DELETE' }),
  emptyTrash: () => request<{ status: string; count: number }>('/api/mail/trash', { method: 'DELETE' }),
  batchMailAction: (publicIds: string[], action: string) => request('/api/mail/batch-action', { method: 'POST', body: JSON.stringify({ publicIds, action }) }),
  sendMail: (to: string, subject: string, textBody: string, attachments: EncodedAttachment[] = []) => request('/api/mail/send', { method: 'POST', body: JSON.stringify({ to, subject, textBody, attachments }) }),
  scheduleMail: (input: { to: string; subject: string; textBody: string; scheduledAt: string; attachments?: EncodedAttachment[] }) => request<{ publicId: string }>('/api/mail/scheduled', { method: 'POST', body: JSON.stringify(input) }),
  generateEmailDraft: (input: { prompt: string; subject: string; textBody: string }) => request<{ subject: string; textBody: string }>('/api/ai/compose', { method: 'POST', body: JSON.stringify(input) }),
  replyToEmail: (id: string, textBody: string, attachments: EncodedAttachment[] = []) => request(`/api/mail/${encodeURIComponent(id)}/reply`, { method: 'POST', body: JSON.stringify({ textBody, attachments }) }),
  createDraft: (draft: Partial<Draft>, attachments: EncodedAttachment[] = []) => request<{ publicId: string }>('/api/drafts', { method: 'POST', body: JSON.stringify({ to: draft.recipientAddress, subject: draft.subject ?? '', textBody: draft.textBody ?? '', attachments }) }),
  updateDraft: (id: string, draft: Partial<Draft>, attachments?: EncodedAttachment[]) => request<Draft>(`/api/drafts/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ to: draft.recipientAddress, subject: draft.subject, textBody: draft.textBody, ...(attachments === undefined ? {} : { attachments }) }) }),
  deleteDraft: (id: string) => request(`/api/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  sendDraft: (id: string) => request(`/api/drafts/${encodeURIComponent(id)}/send`, { method: 'POST' }),
  updateProfile: (input: { name?: string; avatarBase64?: string; gender?: User['gender']; dateOfBirth?: string | null; language?: string }) => request<{ name: string; avatarAvailable?: boolean }>('/api/profile', { method: 'PATCH', body: JSON.stringify(input) }),
  getProfile: () => request<{ name: string; avatarUrl: string | null; gender?: User['gender']; dateOfBirth?: string | null; language?: string }>('/api/profile'),
  registerPushDevice: (token: string, platform: 'ios' | 'android') => request('/api/push/devices', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  unregisterPushDevice: (token: string) => request('/api/push/devices', { method: 'DELETE', body: JSON.stringify({ token }) }),
};
