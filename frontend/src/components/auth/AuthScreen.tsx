import React, { useState, useEffect, useMemo } from 'react';
import { api, createWelcomeEmail } from '../../api';
import type { User } from '../../types';
import { getInitials } from '../../types';
import { SyscallLogo } from '../Logo';
import {
  IconIndiaFlag,
  IconEye,
  IconEyeOff,
  IconAlert,
} from '../Icons';
import { PasswordStrengthMeter, getPasswordStrength } from './PasswordStrengthMeter';
import { OtpInputGroup } from './OtpInputGroup';
import { AuthBrandPanel } from './AuthBrandPanel';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
  initialMode?: 'signin' | 'create';
  onNavigateMode?: (mode: 'signin' | 'create') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  initialMode = 'signin',
  onNavigateMode,
}) => {
  // Mode: 'signin' or 'create'
  const [mode, setMode] = useState<'signin' | 'create'>(initialMode);
  // Sub-step: 'form' or 'otp'
  const [subStep, setSubStep] = useState<'form' | 'otp'>('form');

  useEffect(() => {
    setMode(initialMode);
    setSubStep('form');
  }, [initialMode]);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('7682001264');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [signInWithOtp, setSignInWithOtp] = useState<boolean>(false);

  // OTP State (compact 6 boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const raw10 = phoneInput.replace(/\D/g, '').slice(0, 10);
  const pwdStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Switch modes
  const handleSwitchToCreate = () => {
    setMode('create');
    setSubStep('form');
    setErrorMessage(null);
    if (onNavigateMode) onNavigateMode('create');
  };

  const handleSwitchToSignIn = () => {
    setMode('signin');
    setSubStep('form');
    setErrorMessage(null);
    if (onNavigateMode) onNavigateMode('signin');
  };

  // Submit Create Account Form -> Send OTP to verify phone
  const handleCreateAccountNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (raw10.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian phone number');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestOtp(`+91${raw10}`);
      setResendCooldown(res.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setSubStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification SMS');
    } finally {
      setLoading(false);
    }
  };

  // Submit Sign In Form (Password or OTP)
  const handleSignInNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (raw10.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (signInWithOtp) {
      setLoading(true);
      try {
        const res = await api.requestOtp(`+91${raw10}`);
        setResendCooldown(res.cooldownSeconds || 60);
        setOtpDigits(['', '', '', '', '', '']);
        setSubStep('otp');
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to send OTP to your number');
      } finally {
        setLoading(false);
      }
    } else {
      if (!password) {
        setErrorMessage('Please enter your password');
        return;
      }
      setLoading(true);
      try {
        const authRes = await api.loginWithPassword(`+91${raw10}`, password);
        const user: User = authRes.user || {
          id: `user-${raw10}`,
          phone: raw10,
          emailAddress: `${raw10}@niti`,
          name: localStorage.getItem(`syscall_name_${raw10}`) || fullName.trim() || 'Akshat Joshi',
          passwordConfigured: true,
          accountStatus: 'active',
        };
        api.setSession(authRes.sessionToken || 'demo-session-token');
        if (user.name) {
          localStorage.setItem(`syscall_name_${raw10}`, user.name);
        }

        const existingEmails = localStorage.getItem(`syscall_emails_${raw10}`);
        if (!existingEmails) {
          const welcome = createWelcomeEmail(raw10);
          localStorage.setItem(`syscall_emails_${raw10}`, JSON.stringify([welcome]));
        }

        onSuccess(user);
      } catch (err: any) {
        setErrorMessage(err.message || 'Incorrect password or account not found');
      } finally {
        setLoading(false);
      }
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const fullPhone = `+91${raw10}`;
      const res = await api.verifyOtp(fullPhone, code);

      if (res.user) {
        const user: User = {
          ...res.user,
          name: fullName.trim() || res.user.name || localStorage.getItem(`syscall_name_${raw10}`) || 'Akshat Joshi',
        };
        api.setSession(res.sessionToken || 'demo-session-token');
        if (user.name) {
          localStorage.setItem(`syscall_name_${raw10}`, user.name);
        }

        const existingEmails = localStorage.getItem(`syscall_emails_${raw10}`);
        if (!existingEmails) {
          const welcome = createWelcomeEmail(raw10);
          localStorage.setItem(`syscall_emails_${raw10}`, JSON.stringify([welcome]));
        }

        onSuccess(user);
      } else {
        const user: User = {
          id: `user-${raw10}`,
          phone: raw10,
          emailAddress: `${raw10}@niti`,
          name: fullName.trim() || localStorage.getItem(`syscall_name_${raw10}`) || 'Akshat Joshi',
          passwordConfigured: true,
          accountStatus: 'active',
        };
        api.setSession('demo-session-token');
        if (user.name) {
          localStorage.setItem(`syscall_name_${raw10}`, user.name);
        }

        const existingEmails = localStorage.getItem(`syscall_emails_${raw10}`);
        if (!existingEmails) {
          const welcome = createWelcomeEmail(raw10);
          localStorage.setItem(`syscall_emails_${raw10}`, JSON.stringify([welcome]));
        }

        onSuccess(user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.requestOtp(`+91${raw10}`);
      setResendCooldown(res.cooldownSeconds || 60);
    } catch {
      setErrorMessage('Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageCanvas} className="auth-page-container">
      {/* Left 30% Panel: Holds the exact Sign In / Create Account Card */}
      <div style={styles.authLeftPanel} className="auth-left-panel">
        <div style={styles.authCardWrapper}>
          {/* Clean Google-Style Card */}
          <div style={styles.centeredCard} className="animate-fade-in">
            {/* CENTERED HEADER */}
            <div style={styles.centeredHeader}>
              <div style={styles.logoWrap}>
                <SyscallLogo size={44} />
              </div>

              <span style={styles.brandName}>Syscall</span>

              <h1 style={styles.googleTitle}>
                {subStep === 'otp'
                  ? 'Verify your phone'
                  : mode === 'create'
                  ? 'Create a Syscall Account'
                  : 'Sign in'}
              </h1>

              {subStep === 'otp' ? (
                <p style={styles.googleSubtitle}>
                  Enter the 6-digit code sent to{' '}
                  <strong style={{ color: '#1F1F1F' }}>+91 {raw10}</strong>
                </p>
              ) : mode === 'signin' ? (
                <p style={styles.googleSubtitle}>to continue to Syscall Mail</p>
              ) : null}

              {subStep === 'otp' && (
                <div style={styles.accountIdentityPill}>
                  <div style={styles.accountPillAvatar}>
                    {getInitials(fullName || localStorage.getItem(`syscall_name_${raw10}`) || 'Akshat Joshi')}
                  </div>
                  <span style={styles.accountPillText}>
                    {fullName ? `${fullName} • ` : ''}+91 {raw10}
                  </span>
                  <button
                    style={styles.accountChangeBtn}
                    onClick={() => setSubStep('form')}
                    title="Change phone"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div style={styles.googleErrorBanner} className="animate-fade-in">
                <IconAlert size={18} color="#B91C1C" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. CREATE ACCOUNT FORM */}
            {mode === 'create' && subStep === 'form' && (
              <form onSubmit={handleCreateAccountNext} style={styles.formStack}>
                {/* Full Name */}
                <div style={styles.inputWrapper}>
                  <label style={styles.fieldLabel}>Full name</label>
                  <div style={styles.materialOutlineField}>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Akshat Joshi"
                      style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Phone */}
                <div style={styles.inputWrapper}>
                  <label style={styles.fieldLabel}>Mobile number</label>
                  <div style={styles.materialOutlineField}>
                    <div style={styles.countryBadge}>
                      <IconIndiaFlag size={20} />
                      <span style={styles.dialCode}>+91</span>
                      <div style={styles.vDivider} />
                    </div>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={14}
                      style={styles.phoneInputField}
                    />
                  </div>
                  {raw10.length === 10 && (
                    <span style={styles.phoneMailPreview}>
                      Your PhoneMail: <strong>{raw10}@niti</strong>
                    </span>
                  )}
                </div>

                {/* Password & Confirm */}
                <div style={styles.inputWrapper}>
                  <label style={styles.fieldLabel}>Password</label>
                  <div style={styles.passwordRow}>
                    <div style={{ ...styles.materialOutlineField, flex: 1 }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 chars"
                        style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                      />
                    </div>
                    <div style={{ ...styles.materialOutlineField, flex: 1 }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                      />
                    </div>
                  </div>
                  <PasswordStrengthMeter strength={pwdStrength} />
                </div>

                {/* Show password toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#444746' }}>
                  <input
                    type="checkbox"
                    id="showPassCreate"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="showPassCreate" style={{ cursor: 'pointer' }}>Show password</label>
                </div>

                {/* Bottom Actions */}
                <div style={styles.bottomActions}>
                  <button
                    type="button"
                    onClick={handleSwitchToSignIn}
                    style={styles.textActionBtn}
                  >
                    Sign in instead
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.primaryActionBtn,
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Creating...' : 'Next'}
                  </button>
                </div>
              </form>
            )}

            {/* 2. SIGN IN FORM */}
            {mode === 'signin' && subStep === 'form' && (
              <form onSubmit={handleSignInNext} style={styles.formStack}>
                <div style={styles.inputWrapper}>
                  <label style={styles.fieldLabel}>Mobile number</label>
                  <div style={styles.materialOutlineField}>
                    <div style={styles.countryBadge}>
                      <IconIndiaFlag size={20} />
                      <span style={styles.dialCode}>+91</span>
                      <div style={styles.vDivider} />
                    </div>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={14}
                      style={styles.phoneInputField}
                      autoFocus
                    />
                  </div>
                </div>

                {!signInWithOtp ? (
                  <div style={styles.inputWrapper}>
                    <label style={styles.fieldLabel}>Password</label>
                    <div style={styles.materialOutlineField}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={styles.eyeToggleBtn}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <IconEyeOff size={18} color="#444746" /> : <IconEye size={18} color="#444746" />}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => setSignInWithOtp(true)}
                        style={styles.textActionBtnSmall}
                      >
                        Sign in with OTP instead
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={styles.otpNoticeBox}>
                      <span>We will send a 6-digit one-time code to <strong>+91 {raw10 || '...'}</strong></span>
                    </div>

                    {/* Prominent Use Password button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                      <button
                        type="button"
                        onClick={() => setSignInWithOtp(false)}
                        style={styles.usePasswordBtn}
                      >
                        Use password instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Actions */}
                <div style={styles.bottomActions}>
                  <button
                    type="button"
                    onClick={handleSwitchToCreate}
                    style={styles.textActionBtn}
                  >
                    Create account
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.primaryActionBtn,
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Signing in...' : signInWithOtp ? 'Get Code' : 'Next'}
                  </button>
                </div>
              </form>
            )}

            {/* 3. OTP VERIFICATION STEP */}
            {subStep === 'otp' && (
              <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} style={styles.formStack}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', width: '100%' }}>
                  <span style={styles.fieldLabel}>Enter 6-digit verification code</span>
                  <OtpInputGroup
                    otpDigits={otpDigits}
                    onChangeDigits={setOtpDigits}
                    onComplete={(code) => handleVerifyOtp(code)}
                    onEnter={() => handleVerifyOtp()}
                  />
                </div>

                <div style={styles.resendRow}>
                  {resendCooldown > 0 ? (
                    <span style={styles.resendCooldownText}>Resend code in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      style={styles.resendActiveBtn}
                    >
                      Resend code
                    </button>
                  )}
                </div>

                {/* Bottom Actions */}
                <div style={styles.bottomActions}>
                  <button
                    type="button"
                    onClick={() => setSubStep('form')}
                    style={styles.textActionBtn}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading || otpDigits.some((d) => d === '')}
                    style={{
                      ...styles.primaryActionBtn,
                      opacity: loading || otpDigits.some((d) => d === '') ? 0.6 : 1,
                      cursor: loading || otpDigits.some((d) => d === '') ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right 70% Panel */}
      <AuthBrandPanel />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageCanvas: {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: '#F0F4F9',
    position: 'relative',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  authLeftPanel: {
    width: '420px',
    minWidth: '360px',
    maxWidth: '460px',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E0E2EC',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)',
    zIndex: 10,
    padding: '32px 24px',
    flexShrink: 0,
  },
  authCardWrapper: {
    width: '100%',
    maxWidth: '380px',
  },
  centeredCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
  },
  centeredHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: 700,
    color: '#0B57D0',
    letterSpacing: '-0.3px',
    marginBottom: '12px',
  },
  googleTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '24px',
    fontWeight: 500,
    color: '#1F1F1F',
    margin: '0 0 6px 0',
    lineHeight: '1.25',
  },
  googleSubtitle: {
    fontSize: '15px',
    color: '#444746',
    margin: 0,
    lineHeight: '1.4',
  },
  accountIdentityPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px 4px 6px',
    borderRadius: '16px',
    border: '1px solid #DADCE0',
    backgroundColor: '#F8FAFD',
    marginTop: '14px',
  },
  accountPillAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPillText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1F1F1F',
  },
  accountChangeBtn: {
    background: 'none',
    border: 'none',
    color: '#0B57D0',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0 2px',
  },
  googleErrorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#FDF2F2',
    color: '#B91C1C',
    fontSize: '13.5px',
    fontWeight: 500,
    marginBottom: '20px',
    border: '1px solid #FCA5A5',
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#444746',
  },
  materialOutlineField: {
    display: 'flex',
    alignItems: 'center',
    height: '48px',
    borderRadius: '8px',
    border: '1px solid #747775',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.15s ease',
    overflow: 'hidden',
  },
  countryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 12px',
    backgroundColor: '#F8FAFD',
    height: '100%',
    borderRight: '1px solid #E0E2EC',
  },
  dialCode: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1F1F1F',
  },
  vDivider: {
    width: '1px',
    height: '18px',
    backgroundColor: '#DADCE0',
    marginLeft: '2px',
  },
  phoneInputField: {
    flex: 1,
    height: '100%',
    border: 'none',
    padding: '0 12px',
    fontSize: '15px',
    color: '#1F1F1F',
    fontWeight: 500,
    outline: 'none',
    backgroundColor: 'transparent',
  },
  passwordRow: {
    display: 'flex',
    gap: '10px',
  },
  eyeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    height: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  phoneMailPreview: {
    fontSize: '12.5px',
    color: '#0B57D0',
    marginTop: '2px',
  },
  textActionBtn: {
    background: 'none',
    border: 'none',
    color: '#0B57D0',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'background-color 0.15s ease',
  },
  textActionBtnSmall: {
    background: 'none',
    border: 'none',
    color: '#0B57D0',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  usePasswordBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: '#EAF1FB',
    color: '#0B57D0',
    border: '1px solid #D3E3FD',
    fontWeight: 600,
    fontSize: '12.5px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  otpNoticeBox: {
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#F8FAFD',
    border: '1px solid #EDF2FA',
    fontSize: '13px',
    color: '#444746',
  },
  bottomActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '12px',
    gap: '12px',
  },
  primaryActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 24px',
    height: '42px',
    borderRadius: '21px',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    transition: 'all 0.15s ease',
  },
  resendRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '6px',
  },
  resendCooldownText: {
    fontSize: '13px',
    color: '#747775',
  },
  resendActiveBtn: {
    background: 'none',
    border: 'none',
    color: '#0B57D0',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
