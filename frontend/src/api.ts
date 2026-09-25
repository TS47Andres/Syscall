import type { Email, HealthState, User } from './types';

// Helper to generate the official welcome email for a user
export const createWelcomeEmail = (phone: string, name?: string): Email => ({
  publicId: `welcome-${phone}`,
  senderAddress: 'welcome@syscall.in',
  recipientAddress: `${phone}@niti`,
  subject: 'Welcome to Syscall PhoneMail!',
  textBody: `Hello${name ? ' ' + name.trim() : ''},

Welcome to Syscall! Your Indian mobile number +91 ${phone} is your permanent PhoneMail address: ${phone}@niti.

Here is what you can explore with Syscall:
1. Pure Phone Addressing: Send and receive messages directly using 10-digit mobile numbers at @niti.
2. Official Documentation: Read the developer setup guide at https://syscall.in/docs and inspect repository updates at https://github.com/syscall/phonemail-gateway.
3. Telecom Regulatory Standards: Reviewed in accordance with national directives at www.trai.gov.in/telecom-standards.
4. Real-time Ingestion Antivirus: Incoming MIME attachments and headers are stream-scanned before arrival. View real-time security bulletins at https://clamav.net/security-bulletins.

Feel free to write to postmaster@niti or our support team if you have any questions!

Enjoy your secure PhoneMail experience!
— Syscall Postmaster Team`,
  createdAt: new Date().toISOString(),
  readAt: null,
  isSpam: false,
  attachments: [
    {
      filename: 'Syscall_Getting_Started.pdf',
      contentType: 'application/pdf',
      sizeBytes: 142300,
      clamavStatus: 'clean',
    },
    {
      filename: 'Project_Specification.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 85200,
      clamavStatus: 'clean',
    },
    {
      filename: 'telecom_security_handler.ts',
      contentType: 'text/typescript',
      sizeBytes: 12400,
      clamavStatus: 'clean',
    },
    {
      filename: 'architecture_diagram.png',
      contentType: 'image/png',
      sizeBytes: 320400,
      clamavStatus: 'clean',
    },
    {
      filename: 'demo_walkthrough.mp4',
      contentType: 'video/mp4',
      sizeBytes: 1845000,
      clamavStatus: 'clean',
    },
    {
      filename: 'Security_Certificate.pem',
      contentType: 'application/x-pem-file',
      sizeBytes: 4096,
      clamavStatus: 'clean',
    },
    {
      filename: 'quarantine_unverified_macro.docm',
      contentType: 'application/vnd.ms-word.document.macroEnabled.12',
      sizeBytes: 68400,
      clamavStatus: 'infected',
    },
  ],
});

// Single initial email - nothing extra
export const DEMO_EMAILS: Email[] = [
  createWelcomeEmail('7682001264', 'User'),
];

class SyscallApi {
  private sessionToken: string | null = localStorage.getItem('syscall_session_token');

  setSession(token: string | null) {
    this.sessionToken = token;
    if (token) localStorage.setItem('syscall_session_token', token);
    else localStorage.removeItem('syscall_session_token');
  }

  getSession(): string | null {
    return this.sessionToken;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionToken) {
      h['X-Session-Token'] = this.sessionToken;
    }
    return h;
  }

  // --- Auth / OTP ---
  async requestOtp(phoneE164: string): Promise<{ status: string; cooldownSeconds?: number; code?: string }> {
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneE164 }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return data;
      }
    } catch (err) {
      // Backend offline / network error
    }
    // Generate and store random 6-digit code for verification (also allow 123456 as master test code)
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem(`syscall_otp_${phoneE164}`, generated);
    console.info(`[Syscall Verification] One-Time Password for ${phoneE164} is: ${generated} (or 123456)`);
    return { status: 'otp-sent', cooldownSeconds: 60, code: generated };
  }

  async verifyOtp(phoneE164: string, otp: string): Promise<{ sessionToken: string; user: User }> {
    let backendError: string | null = null;
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneE164, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sessionToken) {
        this.setSession(data.sessionToken);
        return data;
      }
      if (!res.ok) {
        backendError = data.error || 'Invalid verification code';
      }
    } catch (networkErr) {
      // Backend offline or unreachable
    }

    // If backend gave an explicit error (e.g. 400 wrong OTP), reject immediately!
    if (backendError) {
      throw new Error(backendError);
    }

    // In dev / standalone mode: check against generated OTP or test code 123456
    const expected = sessionStorage.getItem(`syscall_otp_${phoneE164}`);
    const matches = (expected && otp === expected) || otp === '123456';
    if (!matches) {
      throw new Error('Invalid verification code. Please check the 6 digits and try again.');
    }

    // Successful OTP verification
    sessionStorage.removeItem(`syscall_otp_${phoneE164}`);
    const raw10 = phoneE164.replace(/\D/g, '').slice(-10);
    const savedName = localStorage.getItem(`syscall_name_${raw10}`);
    const mockUser: User = {
      id: `user-${raw10}`,
      phone: raw10,
      name: savedName || 'Akshat Joshi',
      emailAddress: `${raw10}@niti`,
      passwordConfigured: true,
      accountStatus: 'active',
    };
    const mockToken = `mock-token-${Date.now()}`;
    this.setSession(mockToken);
    return { sessionToken: mockToken, user: mockUser };
  }

  async loginWithPassword(phoneE164: string, password: string): Promise<{ sessionToken: string; user: User }> {
    const raw10 = phoneE164.replace(/\D/g, '').slice(-10);

    // Try backend authentication (/api/auth/password/login) with 2.5s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/api/auth/password/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneE164, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sessionToken) {
        this.setSession(data.sessionToken);
        localStorage.setItem(`syscall_pwd_${raw10}`, password);
        return data;
      }
      if (!res.ok && res.status === 401) {
        throw new Error(data.error || 'Incorrect password. Please try again.');
      }
    } catch (netErr: any) {
      if (netErr.message && netErr.message.includes('Incorrect password')) {
        throw netErr;
      }
      // Live backend unreachable or timed out; proceed with local credentials check
    }

    // Local / Standalone authentication validation:
    const savedPassword = localStorage.getItem(`syscall_pwd_${raw10}`);
    const savedName = localStorage.getItem(`syscall_name_${raw10}`);

    if (savedPassword) {
      if (password !== savedPassword) {
        throw new Error('Incorrect password. Please try again.');
      }
    } else {
      // If no password configured yet, save this password for the user if valid (>=6 chars)
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      localStorage.setItem(`syscall_pwd_${raw10}`, password);
      localStorage.setItem(`syscall_active_${raw10}`, 'true');
    }

    const mockUser: User = {
      id: `user-${raw10}`,
      phone: raw10,
      name: savedName || 'Akshat Joshi',
      emailAddress: `${raw10}@niti`,
      passwordConfigured: true,
      accountStatus: 'active',
    };
    const mockToken = `mock-token-${Date.now()}`;
    this.setSession(mockToken);
    return { sessionToken: mockToken, user: mockUser };
  }

  async register(phoneE164: string, password: string, name?: string): Promise<{ sessionToken: string; user: User }> {
    const raw10 = phoneE164.replace(/\D/g, '').slice(-10);

    // Save user credentials locally so password login works seamlessly offline or online
    localStorage.setItem(`syscall_pwd_${raw10}`, password);
    localStorage.setItem(`syscall_name_${raw10}`, name || 'Akshat Joshi');
    localStorage.setItem(`syscall_active_${raw10}`, 'true');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/api/auth/password/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.headers() },
        body: JSON.stringify({ phone: phoneE164, password, name }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sessionToken) {
        this.setSession(data.sessionToken);
        return data;
      }
    } catch (e: any) {
      // In dev fallback or if endpoint not yet mounted
    }

    const mockUser: User = {
      id: `user-${raw10}`,
      phone: raw10,
      name: name || undefined,
      emailAddress: `${raw10}@niti`,
      passwordConfigured: true,
      accountStatus: 'active',
    };
    const mockToken = `mock-token-${Date.now()}`;
    this.setSession(mockToken);
    return { sessionToken: mockToken, user: mockUser };
  }

  // --- Outbound Telnyx Call ---
  async startOutboundCall(phoneE164: string): Promise<{ status: string; callControlId?: string; error?: string }> {
    const res = await fetch('/calls/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneE164 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Call dispatch failed (${res.status})`);
    return data;
  }

  // --- Mailbox ---
  async getMail(phone?: string): Promise<Email[]> {
    try {
      const res = await fetch('/api/mail', { headers: this.headers() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      // offline or unauthenticated
    }
    if (phone) {
      const stored = localStorage.getItem(`syscall_emails_${phone}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
      const single = createWelcomeEmail(phone);
      localStorage.setItem(`syscall_emails_${phone}`, JSON.stringify([single]));
      return [single];
    }
    return DEMO_EMAILS;
  }

  async sendMail(to: string, subject: string, textBody: string): Promise<{ publicId: string }> {
    const res = await fetch('/api/mail/send', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ to, subject, textBody }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch email');
    return data;
  }

  // --- Health Telemetry ---
  async checkHealth(): Promise<HealthState> {
    try {
      const res = await fetch('/ready');
      if (res.ok) {
        const data = await res.json();
        return {
          ready: data.status === 'ready',
          mongodb: data.dependencies?.mongodb ?? false,
          redis: data.dependencies?.redis ?? false,
          clamav: data.dependencies?.clamav ?? false,
          telnyxConfigured: data.dependencies?.telnyxConfigured ?? false,
          apiPort: 3000,
        };
      }
    } catch {
      // offline
    }
    return {
      ready: false,
      mongodb: false,
      redis: false,
      clamav: false,
      telnyxConfigured: false,
      apiPort: 3000,
    };
  }
}

export const api = new SyscallApi();
