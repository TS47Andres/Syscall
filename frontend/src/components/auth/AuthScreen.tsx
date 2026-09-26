/**
 * File: AuthScreen.tsx
 * Role: Preserves Syscall's branded sign-in and account creation experience and handles backend authentication.
 * Service: Frontend.
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import type { User } from '../../types';
import { getInitials } from '../../types';
import { SyscallLogo } from '../Logo';
import {
  IconIndiaFlag,
  IconEye,
  IconEyeOff,
  IconAlert,
  IconPhone,
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
  const resetToken = new URLSearchParams(window.location.search).get('token');
  const [mode, setMode] = useState<'signin' | 'create'>(initialMode);
  const [subStep, setSubStep] = useState<'form' | 'otp' | 'call-requested' | 'password' | 'reset'>(
    resetToken ? 'reset' : 'form'
  );

  useEffect(() => {
    setMode(initialMode);
    setSubStep(resetToken ? 'reset' : 'form');
  }, [initialMode, resetToken]);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('7682001264');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [signInWithOtp, setSignInWithOtp] = useState<boolean>(false);

  // OTP State (compact 6 boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetAfterOtp, setResetAfterOtp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [previewUser, setPreviewUser] = useState<{ name: string; avatarUrl: string | null } | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const raw10 = phoneInput.replace(/\D/g, '').slice(-10);

  // Pre-fetch user preview when 10 digits are entered
  useEffect(() => {
    if (raw10.length === 10) {
      void api.previewPhone(`+91${raw10}`).then((res) => {
        if (res?.user) {
          setPreviewUser(res.user);
        }
      }).catch(() => {});
    }
  }, [raw10]);

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

  // Optional voice-assisted onboarding request
  const handleRequestVoiceSetup = async () => {
    setErrorMessage(null);
    if (fullName.trim().length < 2) {
      setErrorMessage('Please enter your full name before requesting a call');
      return;
    }
    if (raw10.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      await api.requestAccountCall(raw10, fullName.trim());
      setSubStep('call-requested');
    } catch (reason: any) {
      setErrorMessage(reason.message || 'Could not request the setup call');
    } finally {
      setLoading(false);
    }
  };

  // Sends an OTP to an existing account for sign-in or password reset
  const requestOtp = async (isPasswordReset = false): Promise<void> => {
    setErrorMessage(null);
    if (raw10.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      const result = await api.requestOtp(`+91${raw10}`);
      if (result.user) {
        setPreviewUser(result.user);
        if (result.user.name) setFullName(result.user.name);
      }
      setResendCooldown(result.cooldownSeconds ?? 60);
      setOtpDigits(['', '', '', '', '', '']);
      setResetAfterOtp(isPasswordReset);
      setSubStep('otp');
      if (isPasswordReset) {
        setErrorMessage('If an account exists, a verification code has been sent by SMS.');
      }
    } catch (reason: any) {
      setErrorMessage(reason.message || 'Could not request a verification code');
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
      await requestOtp(false);
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
          name: previewUser?.name || fullName.trim() || 'Syscall User',
          avatarUrl: previewUser?.avatarUrl || undefined,
          passwordConfigured: true,
          accountStatus: 'active',
        };
        onSuccess(user);
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid mobile number or password');
      } finally {
        setLoading(false);
      }
    }
  };

  // Verify OTP for Signup or Sign-in
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

      if (resetAfterOtp) {
        setResetAfterOtp(false);
        setSubStep('password');
        return;
      }

      // If user came from Create Account and specified a password, set it
      if (mode === 'create' && password) {
        try {
          await api.setPassword(password);
        } catch {
          // Password set best-effort
        }
      }

      // If user provided a name during create, update it
      if (mode === 'create' && fullName.trim()) {
        try {
          await api.updateProfile({ name: fullName.trim() });
        } catch {
          // Name update best-effort
        }
      }

      if (res.user) {
        const user: User = {
          ...res.user,
          name: res.user.name || previewUser?.name || fullName.trim() || 'Syscall User',
          avatarUrl: res.user.avatarUrl || previewUser?.avatarUrl || undefined,
        };
        onSuccess(user);
      } else {
        const fallbackUser: User = {
          id: `user-${raw10}`,
          phone: raw10,
          emailAddress: `${raw10}@niti`,
          name: previewUser?.name || fullName.trim() || 'Syscall User',
          avatarUrl: previewUser?.avatarUrl || undefined,
          passwordConfigured: true,
          accountStatus: 'active',
        };
        onSuccess(fallbackUser);
      }
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('internal server error') || msg.includes('otp') || msg.includes('invalid') || msg.includes('wrong') || msg.includes('expired')) {
        setErrorMessage('Wrong OTP, try again.');
      } else {
        setErrorMessage(err.message || 'Wrong OTP, try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await api.setPassword(password);
      onSuccess(result.user);
    } catch (reason: any) {
      setErrorMessage(reason.message || 'Could not save the password');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!resetToken) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await api.resetPassword(resetToken, password);
      setSubStep('form');
      setMode('signin');
      setErrorMessage('Password reset successful. Please sign in with your new password.');
    } catch (reason: any) {
      setErrorMessage(reason.message || 'Could not reset password.');
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
        {/* Top-Left Brand Header */}
        <div style={styles.panelTopBrand}>
          <SyscallLogo size={38} />
          <span style={styles.panelTopBrandText}>Syscall</span>
        </div>

        <div style={styles.authCardWrapper}>
          {/* Clean Google-Style Card */}
          <div style={styles.centeredCard} className="animate-fade-in">
            {/* CARD TITLE & SUBTITLE */}
            <div style={styles.centeredHeader}>
              <h1 style={styles.googleTitle}>
                {subStep === 'otp'
                  ? 'Verify your phone'
                  : subStep === 'password'
                  ? 'Set your password'
                  : subStep === 'reset'
                  ? 'Reset your password'
                  : subStep === 'call-requested'
                  ? 'Call Requested'
                  : mode === 'create'
                  ? 'Create a Syscall Account'
                  : 'Sign in'}
              </h1>

              {subStep === 'otp' ? (
                <p style={styles.googleSubtitle}>
                  Enter the 6-digit code sent to{' '}
                  <strong style={{ color: '#1F1F1F' }}>+91 {raw10}</strong>
                </p>
              ) : mode === 'signin' && subStep === 'form' ? (
                <p style={styles.googleSubtitle}>to continue to Syscall Mail</p>
              ) : mode === 'create' && subStep === 'form' ? (
                <p style={styles.googleSubtitle}>to continue to Syscall Mail</p>
              ) : null}

              {subStep === 'otp' && (
                <div style={styles.accountIdentityPill}>
                  <div style={styles.accountPillAvatar}>
                    {previewUser?.avatarUrl ? (
                      <img
                        src={previewUser.avatarUrl}
                        alt="Avatar"
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      getInitials(previewUser?.name || fullName || 'User')
                    )}
                  </div>
                  <span style={styles.accountPillText}>
                    {(previewUser?.name || fullName) ? `${previewUser?.name || fullName} · ` : ''}+91 {raw10}
                  </span>
                  <button
                    style={styles.accountChangeBtn}
                    onClick={() => setSubStep('form')}
                    title="Change phone"
                    type="button"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Error Message (for non-signin/non-otp steps) */}
            {errorMessage && subStep !== 'otp' && (mode !== 'signin' || subStep !== 'form') && (
              <div style={styles.googleErrorBanner} className="animate-fade-in">
                <IconAlert size={16} color="#D93025" />
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
                      placeholder="e.g. Your Name"
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
                      Your Syscall address: <strong>{raw10}@niti</strong>
                    </span>
                  )}
                </div>

                {/* Password & Confirm Password */}
                <div style={styles.inputWrapper}>
                  <label style={styles.fieldLabel}>Password</label>
                  <div style={styles.materialOutlineField}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                    />
                    <button
                      type="button"
                      style={styles.eyeToggleBtn}
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <IconEyeOff size={18} color="#444746" /> : <IconEye size={18} color="#444746" />}
                    </button>
                  </div>
                </div>

                {/* Interactive Password Strength Meter */}
                {password.length > 0 && (
                  <PasswordStrengthMeter strength={getPasswordStrength(password)} />
                )}

                <div style={styles.inputWrapper}>
                  <label style={styles.fieldLabel}>Confirm password</label>
                  <div style={styles.materialOutlineField}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                    />
                    <button
                      type="button"
                      style={styles.eyeToggleBtn}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <IconEyeOff size={18} color="#444746" /> : <IconEye size={18} color="#444746" />}
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={styles.bottomActions}>
                  <button
                    type="button"
                    style={styles.textActionBtn}
                    onClick={handleSwitchToSignIn}
                  >
                    Sign in instead
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...styles.primaryActionBtn,
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Sending code...' : 'Next'}
                  </button>
                </div>

                {/* Voice Onboarding Alternative */}
                <div style={styles.voiceSetupRow}>
                  <button
                    type="button"
                    style={styles.voiceSetupBtn}
                    onClick={handleRequestVoiceSetup}
                    disabled={loading}
                    title="Have our voice assistant call your phone to verify and create your account"
                  >
                    <IconPhone size={14} color="#0B57D0" />
                    <span>Or request an automated voice setup call</span>
                  </button>
                </div>
              </form>
            )}

            {/* 2. SIGN IN FORM */}
            {mode === 'signin' && subStep === 'form' && (
              <form onSubmit={handleSignInNext} style={styles.formStack}>
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
                      onChange={(e) => {
                        if (errorMessage) setErrorMessage('');
                        setPhoneInput(e.target.value);
                      }}
                      placeholder="10-digit mobile number"
                      maxLength={14}
                      style={styles.phoneInputField}
                      autoFocus
                    />
                  </div>
                  {errorMessage && signInWithOtp && (
                    <div style={styles.fieldInlineError} className="animate-fade-in">
                      <IconAlert size={14} color="#D93025" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Password vs OTP */}
                {!signInWithOtp ? (
                  <div style={styles.inputWrapper}>
                    <label style={styles.fieldLabel}>Password</label>
                    <div style={styles.materialOutlineField}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          if (errorMessage) setErrorMessage('');
                          setPassword(e.target.value);
                        }}
                        placeholder="Enter your password"
                        style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                      />
                      <button
                        type="button"
                        style={styles.eyeToggleBtn}
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <IconEyeOff size={18} color="#444746" /> : <IconEye size={18} color="#444746" />}
                      </button>
                    </div>

                    {/* Inline error: no bg, below password field and above forgot password button */}
                    {errorMessage && (
                      <div style={styles.fieldInlineError} className="animate-fade-in">
                        <IconAlert size={14} color="#D93025" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        type="button"
                        style={styles.textActionBtnSmall}
                        onClick={() => void requestOtp(true)}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                      <button
                        type="button"
                        style={styles.textActionBtnSmall}
                        onClick={() => setSignInWithOtp(true)}
                      >
                        Sign in with OTP instead
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <button
                      type="button"
                      style={styles.usePasswordBtn}
                      onClick={() => setSignInWithOtp(false)}
                    >
                      Use password instead
                    </button>
                  </div>
                )}

                {/* Bottom Actions */}
                <div style={styles.bottomActions}>
                  <button
                    type="button"
                    style={styles.textActionBtn}
                    onClick={handleSwitchToCreate}
                  >
                    Create account
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...styles.primaryActionBtn,
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                    disabled={loading}
                  >
                    {loading
                      ? 'Signing in...'
                      : signInWithOtp
                      ? 'Get Code'
                      : 'Next'}
                  </button>
                </div>
              </form>
            )}

            {/* 3. OTP VERIFICATION SUBSTEP */}
            {subStep === 'otp' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleVerifyOtp();
                }}
                style={styles.formStack}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: '100%' }}>
                  <span style={styles.fieldLabel}>Enter 6-digit verification code</span>
                  <OtpInputGroup
                    otpDigits={otpDigits}
                    onChangeDigits={(digits) => {
                      if (errorMessage) setErrorMessage('');
                      setOtpDigits(digits);
                    }}
                    onComplete={(code) => void handleVerifyOtp(code)}
                    onEnter={() => void handleVerifyOtp()}
                  />
                </div>

                {/* Inline OTP Error: Clean, no background, below input fields and above resend code button */}
                {errorMessage && (
                  <div style={styles.otpInlineError} className="animate-fade-in">
                    <IconAlert size={15} color="#D93025" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div style={styles.resendRow}>
                  {resendCooldown > 0 ? (
                    <span style={styles.resendCooldownText}>
                      Resend code in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      style={styles.resendActiveBtn}
                      onClick={() => void handleResendOtp()}
                    >
                      Resend code
                    </button>
                  )}
                </div>

                <div style={styles.bottomActions}>
                  <button
                    type="button"
                    style={styles.textActionBtn}
                    onClick={() => setSubStep('form')}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...styles.primaryActionBtn,
                      opacity: loading || otpDigits.some((d) => !d) ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                    disabled={loading || otpDigits.some((d) => !d)}
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                </div>
              </form>
            )}

            {/* 4. SET PASSWORD SUBSTEP */}
            {subStep === 'password' && (
              <form onSubmit={handleSetPassword} style={styles.formStack}>
                <div style={styles.inputWrapper}>
                  <label style={styles.fieldLabel}>New password</label>
                  <div style={styles.materialOutlineField}>
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                      autoFocus
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
                </div>

                {password.length > 0 && <PasswordStrengthMeter strength={getPasswordStrength(password)} />}

                <div style={styles.bottomActions}>
                  <span />
                  <button type="submit" disabled={loading} style={styles.primaryActionBtn}>
                    {loading ? 'Saving...' : 'Set password'}
                  </button>
                </div>
              </form>
            )}

            {/* 5. RESET PASSWORD FROM URL TOKEN SUBSTEP */}
            {subStep === 'reset' && (
              <form onSubmit={handleCompleteReset} style={styles.formStack}>
                <div style={styles.inputWrapper}>
                  <label style={styles.fieldLabel}>New password</label>
                  <div style={styles.materialOutlineField}>
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      style={{ ...styles.phoneInputField, paddingLeft: 14 }}
                      autoFocus
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
                </div>

                {password.length > 0 && <PasswordStrengthMeter strength={getPasswordStrength(password)} />}

                <div style={styles.bottomActions}>
                  <button type="button" onClick={() => handleSwitchToSignIn()} style={styles.textActionBtn}>
                    Back to sign in
                  </button>
                  <button type="submit" disabled={loading} style={styles.primaryActionBtn}>
                    {loading ? 'Resetting...' : 'Reset password'}
                  </button>
                </div>
              </form>
            )}

            {/* 6. CALL REQUESTED NOTICE SUBSTEP */}
            {subStep === 'call-requested' && (
              <div style={styles.formStack}>
                <div style={styles.otpNoticeBox}>
                  Your automated onboarding call has been requested. When your phone rings, the voice assistant will confirm your name <strong>"{fullName.trim()}"</strong> and set up your account.
                </div>
                <div style={styles.bottomActions}>
                  <button type="button" onClick={() => handleSwitchToSignIn()} style={styles.textActionBtn}>
                    Back to sign in
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right 70% Panel: Visual Brand Illustration & Features */}
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
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E0E2EC',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)',
    zIndex: 10,
    padding: '36px 36px 32px 36px',
    flexShrink: 0,
    boxSizing: 'border-box',
    position: 'relative',
  },
  panelTopBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: 'auto',
  },
  panelTopBrandText: {
    fontFamily: 'var(--font-display)',
    fontSize: '26px',
    fontWeight: 700,
    color: '#0B57D0',
    letterSpacing: '-0.3px',
  },
  authCardWrapper: {
    width: '100%',
    maxWidth: '380px',
    margin: 'auto 0',
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
    gap: '8px',
    padding: '4px 0',
    backgroundColor: 'transparent',
    background: 'none',
    color: '#D93025',
    fontSize: '13px',
    fontWeight: 500,
    marginBottom: '16px',
    border: 'none',
  },
  fieldInlineError: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#D93025',
    fontSize: '13px',
    fontWeight: 500,
    marginTop: '6px',
    marginBottom: '2px',
  },
  otpInlineError: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#D93025',
    fontSize: '13px',
    fontWeight: 500,
    padding: '2px 0',
    textAlign: 'center',
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
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
    background: 'none',
    border: 'none',
    color: '#0B57D0',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px 0',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'color 0.15s ease',
  },
  otpNoticeBox: {
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#F8FAFD',
    border: '1px solid #EDF2FA',
    fontSize: '13px',
    color: '#444746',
    lineHeight: '1.4',
  },
  bottomActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
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
  voiceSetupRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '6px',
  },
  voiceSetupBtn: {
    background: 'none',
    border: 'none',
    color: '#0B57D0',
    fontSize: '12.5px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '6px',
    transition: 'background-color 0.15s ease',
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
