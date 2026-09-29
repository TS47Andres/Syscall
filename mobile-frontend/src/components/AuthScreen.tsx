import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text, DisplayText } from './Text';
import { Icon } from './Icon';
import { SyscallLogo } from './SyscallLogo';
import { c } from '../lib/theme';
import { api } from '../lib/api';
import type { User } from '../lib/types';

export function AuthScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'phone'|'password'|'otp'|'setup'|'callRequested'>('phone');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalized = phone.replace(/\D/g, '').slice(-10);
  const fullPhone = `+91${normalized}`;
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); } finally { setBusy(false); } };
  const continuePhone = () => void run(async () => {
    if (normalized.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
    const preview = await api.previewPhone(fullPhone);
    if (preview.exists) setStage('password');
    else setCreating(true);
  });
  const requestSetupCall = () => void run(async () => { if(normalized.length!==10)throw new Error('Enter a valid 10-digit mobile number.');if(fullName.trim().length<2)throw new Error('Enter your full name.');await api.requestAccountCall(normalized,fullName.trim());setStage('callRequested'); });
  const loginPassword = () => void run(async () => {
    const result = await api.loginWithPassword(fullPhone, password); onSignedIn(result.user);
  });
  const requestCode = () => void run(async () => { await api.requestOtp(fullPhone); setStage('otp'); });
  const verifyCode = () => void run(async () => { const result = await api.verifyOtp(fullPhone, otp); if(result.user.passwordConfigured)onSignedIn(result.user);else setStage('setup'); });
  const saveInitialPassword = () => void run(async () => { if(newPassword.length<8)throw new Error('Use at least 8 characters for your password.');const result=await api.setInitialPassword(newPassword);onSignedIn(result.user); });
  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.brand}><SyscallLogo size={58}/><DisplayText style={s.brandName}>Syscall</DisplayText></View>
    <View style={s.card}>
      <Text style={s.eyebrow}>{stage==='callRequested'?'ACCOUNT SETUP':creating?'CREATE ACCOUNT':'WELCOME BACK'}</Text>
      <DisplayText style={s.title}>{stage === 'phone' ? (creating?'Create your account':'Sign in to continue') : stage === 'password' ? 'Enter your password' : stage==='otp'?'Verify your number':stage==='setup'?'Create a password':stage==='callRequested'?'Setup call requested':'Sign in'}</DisplayText>
      <Text style={s.subtitle}>{stage === 'otp' ? `We sent a verification code to +91 ${normalized}` : stage==='setup'?'Add a password to finish setting up your account.':stage==='callRequested'?'Answer the automated call to finish creating your account.':'Your email, calls, and messages in one place.'}</Text>
      {stage === 'phone' && creating ? <><Text style={s.fieldLabel}>Full name</Text><TextInput value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor={c.light} autoComplete="name" style={[s.input,{marginBottom:10}]}/></> : null}
      {stage === 'phone' ? <View style={s.phoneRow}><View style={s.prefix}><Text style={s.prefixText}>+91</Text></View><TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" placeholderTextColor={c.light} keyboardType="phone-pad" autoComplete="tel" style={s.input}/></View> : null}
      {stage === 'password' ? <><Text style={s.fieldLabel}>Password</Text><TextInput value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor={c.light} secureTextEntry autoComplete="password" style={s.input}/><Pressable onPress={requestCode}><Text style={s.link}>Use a one-time code instead</Text></Pressable></> : null}
      {stage === 'otp' ? <><Text style={s.fieldLabel}>6-digit code</Text><TextInput value={otp} onChangeText={setOtp} placeholder="000000" placeholderTextColor={c.light} keyboardType="number-pad" maxLength={6} style={[s.input, s.otp]}/><Pressable onPress={requestCode}><Text style={s.link}>Resend code</Text></Pressable></> : null}
      {stage === 'setup' ? <><Text style={s.fieldLabel}>Password</Text><TextInput value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" placeholderTextColor={c.light} secureTextEntry autoComplete="new-password" style={s.input}/></> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
      {stage==='callRequested'?<View style={s.callNotice}><Icon name="check" color={c.green}/><Text style={s.callNoticeText}>Keep your phone nearby for the setup call.</Text></View>:null}
      {stage!=='callRequested'&&<Pressable disabled={busy} onPress={stage === 'phone' ? (creating?requestSetupCall:continuePhone) : stage === 'password' ? loginPassword : stage==='otp'?verifyCode:saveInitialPassword} style={({ pressed }) => [s.primary, pressed && { backgroundColor: c.blueHover }, busy && { opacity: .65 }]}>
        {busy ? <ActivityIndicator color="#FFFFFF"/> : <><Text style={s.primaryText}>{stage === 'phone' ? (creating?'Request setup call':'Continue') : stage === 'password' ? 'Sign in' : stage==='otp'?'Verify and sign in':'Save password'}</Text><Icon name="chevron" size={18} color="#FFFFFF"/></>}
      </Pressable>}
      {stage === 'phone' ? (
        <Pressable onPress={() => { setCreating(!creating); setError(''); }} style={s.back}><Text style={s.backText}>{creating ? 'Already have an account? Sign in' : 'Create an account'}</Text></Pressable>
      ) : stage !== 'callRequested' ? (
        <Pressable onPress={() => { setStage('phone'); setError(''); }} style={s.back}><Icon name="back" size={17}/><Text style={s.backText}>Change phone number</Text></Pressable>
      ) : null}
    </View>
    <Text style={s.footer}>Secure email, built for everyday conversations.</Text>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 24, justifyContent: 'center' }, brand: { alignItems: 'center', marginBottom: 28, gap: 9 }, logo: { height: 56, width: 56, borderRadius: 18, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }, logoTick: { position: 'absolute', right: 8, bottom: 8 }, brandName: { fontSize: 24, letterSpacing: -.3 }, card: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: c.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#EDF0F5', shadowColor: '#202124', shadowOpacity: .07, shadowRadius: 18, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, eyebrow: { color: c.blue, letterSpacing: 1.3, fontSize: 10, fontWeight: '700', marginBottom: 10 }, title: { fontSize: 23, marginBottom: 8 }, subtitle: { color: c.sub, fontSize: 13, lineHeight: 20, marginBottom: 23 }, phoneRow: { flexDirection: 'row', gap: 8 }, prefix: { height: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#FAFBFD' }, prefixText: { fontSize: 13, color: c.sub }, input: { flex: 1, height: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, color: c.text, fontSize: 15, backgroundColor: '#FFFFFF' }, fieldLabel: { color: c.sub, fontSize: 12, fontWeight: '600', marginBottom: 7, marginTop: 2 }, otp: { letterSpacing: 8, fontSize: 20 }, link: { color: c.blue, fontWeight: '600', fontSize: 12, marginTop: 12 }, error: { color: '#B3261E', fontSize: 12, marginTop: 12, lineHeight: 17 }, primary: { marginTop: 23, height: 48, borderRadius: 24, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, primaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 }, back: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, backText: { fontSize: 12, color: c.sub }, callNotice:{marginTop:16,flexDirection:'row',alignItems:'center',gap:8},callNoticeText:{fontSize:12,color:c.green}, footer: { color: c.light, fontSize: 11, textAlign: 'center', marginTop: 22 } });
