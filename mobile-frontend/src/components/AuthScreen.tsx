import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, DisplayText } from './Text';
import { Icon } from './Icon';
import { SyscallLogo } from './SyscallLogo';
import { c } from '../lib/theme';
import { api } from '../lib/api';
import type { User } from '../lib/types';

type AuthStage = 'form' | 'otp' | 'setPassword' | 'callRequested';
type OtpPurpose = 'signIn' | 'initialPassword' | 'resetPassword';

export function AuthScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<AuthStage>('form');
  const [creating, setCreating] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>('signIn');
  const [signInWithOtp, setSignInWithOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalized = phone.replace(/\D/g, '').slice(-10);
  const fullPhone = `+91${normalized}`;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  const requestCode = (purpose: OtpPurpose) => void run(async () => {
    if (normalized.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
    await api.requestOtp(fullPhone);
    setOtpPurpose(purpose);
    setOtp('');
    setStage('otp');
  });

  const continueSignIn = () => {
    if (!creating && signInWithOtp) {
      requestCode('signIn');
      return;
    }
    void run(async () => {
      if (normalized.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
      if (creating) {
        if (fullName.trim().length < 2) throw new Error('Enter your full name.');
        await api.requestAccountCall(normalized, fullName.trim());
        setStage('callRequested');
        return;
      }
      if (!password) throw new Error('Please enter your password.');
      const result = await api.loginWithPassword(fullPhone, password);
      onSignedIn(result.user);
    });
  };

  const verifyCode = () => void run(async () => {
    if (normalized.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
    if (otp.length !== 6) throw new Error('Enter the complete 6-digit code.');
    const result = await api.verifyOtp(fullPhone, otp);
    if (otpPurpose === 'initialPassword') {
      setStage('setPassword');
      return;
    }
    if (otpPurpose === 'resetPassword') {
      setStage('setPassword');
      return;
    }
    if (result.user.passwordConfigured) onSignedIn(result.user);
    else setStage('setPassword');
  });

  const savePassword = () => void run(async () => {
    if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
    const result = otpPurpose === 'resetPassword'
      ? await api.setPassword(password)
      : await api.setInitialPassword(password);
    onSignedIn(result.user);
  });

  const isPasswordFlow = stage === 'setPassword';
  const title = stage === 'otp'
    ? 'Verify your number'
    : isPasswordFlow
      ? 'Set your password'
      : stage === 'callRequested'
        ? 'Call requested'
        : creating
          ? 'Create a Syscall Account'
          : 'Sign in';
  const subtitle = stage === 'otp'
    ? `Enter the 6-digit code sent to +91 ${normalized}`
    : isPasswordFlow
      ? 'Choose a password to finish setting up your account.'
      : stage === 'callRequested'
        ? 'Answer the automated call to finish creating your account.'
        : creating
          ? 'Create your account with a quick phone call'
          : 'to continue to Syscall Mail';

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top + 14, paddingBottom: Math.max(insets.bottom, 14) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brand}>
          <SyscallLogo size={42} />
          <DisplayText style={s.brandName}>Syscall</DisplayText>
        </View>

        <View style={s.card}>
          <View style={s.heading}>
            <DisplayText style={s.title}>{title}</DisplayText>
            <Text style={s.subtitle}>{subtitle}</Text>
          </View>

          {stage === 'form' && creating ? (
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Full name</Text>
              <TextInput
                value={fullName}
                onChangeText={(value) => { setFullName(value); setError(''); }}
                placeholder="e.g. Your Name"
                placeholderTextColor={c.light}
                autoComplete="name"
                returnKeyType="next"
                style={s.textField}
              />
            </View>
          ) : null}

          {stage === 'form' ? (
            <>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Mobile number</Text>
                <View style={s.phoneField}>
                  <View style={s.countryBadge}>
                    <Text style={s.flag}>🇮🇳</Text>
                    <Text style={s.dialCode}>+91</Text>
                    <View style={s.countryDivider} />
                  </View>
                  <TextInput
                    value={phone}
                    onChangeText={(value) => { setPhone(value); setError(''); }}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={c.light}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    maxLength={14}
                    returnKeyType={creating || showPassword ? 'done' : 'next'}
                    style={s.phoneInput}
                  />
                </View>
              </View>

              {!creating && !signInWithOtp ? (
                <View style={[s.fieldGroup, s.passwordGroup]}>
                  <Text style={s.fieldLabel}>Password</Text>
                  <View style={s.passwordField}>
                    <TextInput
                      value={password}
                      onChangeText={(value) => { setPassword(value); setError(''); }}
                      placeholder="Enter your password"
                      placeholderTextColor={c.light}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      returnKeyType="done"
                      onSubmitEditing={continueSignIn}
                      style={s.passwordInput}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      onPress={() => setShowPassword((value) => !value)}
                      style={s.eyeButton}
                    >
                      <Icon name={showPassword ? 'eyeOff' : 'eye'} size={21} color={c.sub} />
                    </Pressable>
                  </View>

                  <View style={s.accountLinks}>
                    <Pressable onPress={() => requestCode('initialPassword')} disabled={busy}>
                      <Text style={s.link}>New User? Set Password</Text>
                    </Pressable>
                    <Pressable onPress={() => requestCode('resetPassword')} disabled={busy}>
                      <Text style={s.link}>Forgot password?</Text>
                    </Pressable>
                    <Pressable onPress={() => { setSignInWithOtp(true); setError(''); }} disabled={busy}>
                      <Text style={s.link}>Sign in with OTP instead</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {!creating && signInWithOtp ? (
                <View style={[s.fieldGroup, s.passwordGroup]}>
                  <Pressable onPress={() => { setSignInWithOtp(false); setError(''); }}>
                    <Text style={s.link}>Use password instead</Text>
                  </Pressable>
                </View>
              ) : null}

              {error ? <Text style={s.error}>{error}</Text> : null}

              <View style={s.actions}>
                <Pressable
                  onPress={() => { setCreating((value) => !value); setError(''); setPassword(''); }}
                  disabled={busy}
                  style={s.textAction}
                >
                  <Text style={s.actionLink}>{creating ? 'Sign in instead' : 'Create account'}</Text>
                </Pressable>
                <Pressable
                  onPress={continueSignIn}
                  disabled={busy}
                  style={({ pressed }) => [s.primary, pressed && !busy && s.primaryPressed, busy && s.disabled]}
                >
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>{creating ? 'Request a call' : signInWithOtp ? 'Get Code' : 'Next'}</Text>}
                </Pressable>
              </View>
            </>
          ) : null}

          {stage === 'otp' ? (
            <>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>6-digit verification code</Text>
                <TextInput
                  value={otp}
                  onChangeText={(value) => { setOtp(value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="000000"
                  placeholderTextColor={c.light}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  style={[s.textField, s.otpInput]}
                />
              </View>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <View style={s.actions}>
                <Pressable onPress={() => { setStage('form'); setError(''); }} style={s.textAction}>
                  <Text style={s.actionLink}>Change number</Text>
                </Pressable>
                <Pressable onPress={verifyCode} disabled={busy} style={({ pressed }) => [s.primary, pressed && !busy && s.primaryPressed, busy && s.disabled]}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>Verify</Text>}
                </Pressable>
              </View>
            </>
          ) : null}

          {isPasswordFlow ? (
            <>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>New password</Text>
                <View style={s.passwordField}>
                  <TextInput
                    value={password}
                    onChangeText={(value) => { setPassword(value); setError(''); }}
                    placeholder="At least 8 characters"
                    placeholderTextColor={c.light}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    style={s.passwordInput}
                  />
                  <Pressable onPress={() => setShowPassword((value) => !value)} style={s.eyeButton}>
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={21} color={c.sub} />
                  </Pressable>
                </View>
              </View>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <View style={[s.actions, s.singleAction]}>
                <Pressable onPress={savePassword} disabled={busy} style={({ pressed }) => [s.primary, pressed && !busy && s.primaryPressed, busy && s.disabled]}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>Set password</Text>}
                </Pressable>
              </View>
            </>
          ) : null}

          {stage === 'callRequested' ? (
            <>
              <View style={s.callNotice}>
                <Icon name="check" color={c.green} />
                <Text style={s.callNoticeText}>Keep your phone nearby for the setup call.</Text>
              </View>
              <Pressable onPress={() => { setStage('form'); setCreating(false); }} style={s.secondaryAction}>
                <Text style={s.actionLink}>Back to sign in</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F9', paddingHorizontal: 20 },
  content: { flexGrow: 1, paddingBottom: 24 },
  brand: { height: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 10, marginBottom: 84 },
  brandName: { color: c.blue, fontSize: 28, letterSpacing: -0.5 },
  card: {
    width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: c.surface,
    borderRadius: 22, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 22,
    borderWidth: 1, borderColor: '#EDF0F5', shadowColor: '#202124', shadowOpacity: 0.08,
    shadowRadius: 18, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  heading: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 25, lineHeight: 32, textAlign: 'center', marginBottom: 6 },
  subtitle: { color: c.sub, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  fieldGroup: { width: '100%' },
  fieldLabel: { color: c.sub, fontSize: 14, lineHeight: 20, fontWeight: '600', marginBottom: 8 },
  phoneField: {
    height: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: '#747775', borderRadius: 9, backgroundColor: '#FFFFFF', overflow: 'hidden',
  },
  countryBadge: { height: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, backgroundColor: '#F8FAFD' },
  flag: { fontSize: 18 },
  dialCode: { color: c.text, fontSize: 15, fontWeight: '600' },
  countryDivider: { width: 1, height: 24, backgroundColor: '#DADCE0', marginLeft: 2 },
  phoneInput: { flex: 1, minWidth: 0, height: '100%', paddingHorizontal: 14, color: c.text, fontSize: 16, fontFamily: 'Inter_500Medium' },
  passwordGroup: { marginTop: 20 },
  passwordField: {
    height: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: '#747775', borderRadius: 9, backgroundColor: '#FFFFFF', overflow: 'hidden',
  },
  passwordInput: { flex: 1, minWidth: 0, height: '100%', paddingLeft: 14, color: c.text, fontSize: 16, fontFamily: 'Inter_500Medium' },
  eyeButton: { width: 48, height: '100%', alignItems: 'center', justifyContent: 'center' },
  textField: { height: 52, borderWidth: 1, borderColor: '#747775', borderRadius: 9, paddingHorizontal: 14, color: c.text, fontSize: 16, fontFamily: 'Inter_500Medium', backgroundColor: '#FFFFFF' },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 20 },
  accountLinks: { gap: 14, marginTop: 16, alignItems: 'flex-start' },
  link: { color: c.blue, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  error: { color: '#B3261E', fontSize: 13, lineHeight: 19, marginTop: 12 },
  actions: { marginTop: 48, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  singleAction: { justifyContent: 'flex-end' },
  textAction: { minHeight: 48, justifyContent: 'center' },
  actionLink: { color: c.blue, fontSize: 16, fontWeight: '600' },
  primary: { minWidth: 104, height: 48, paddingHorizontal: 26, borderRadius: 24, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  primaryPressed: { backgroundColor: c.blueHover },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.65 },
  callNotice: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  callNoticeText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.green },
  secondaryAction: { alignSelf: 'flex-start', paddingVertical: 10, marginTop: 20 },
});
