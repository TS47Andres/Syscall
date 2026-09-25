import React, { useState } from 'react';
import { api } from '../api';
import { IconPhone, IconClose, IconIndiaFlag } from './Icons';

interface DialerModalProps {
  initialPhone?: string;
  onClose: () => void;
}

export const DialerModal: React.FC<DialerModalProps> = ({ initialPhone = '7682001264', onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone.replace(/\D/g, '').slice(-10));
  const [calling, setCalling] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'active' | 'ended'>('idle');
  const [callControlId, setCallControlId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDigitPress = (digit: string) => {
    if (callStatus === 'active') {
      console.log('DTMF sent:', digit);
      return;
    }
    if (phoneNumber.length < 10) {
      setPhoneNumber((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleStartCall = async () => {
    if (phoneNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    setCalling(true);
    setCallStatus('calling');
    setErrorMsg(null);
    try {
      const res = await api.startOutboundCall(`+91${phoneNumber}`);
      setCallStatus('active');
      setCallControlId(res.callControlId || 'started');
    } catch (err: any) {
      setErrorMsg(err.message || 'Call dispatch failed.');
      setCallStatus('idle');
    } finally {
      setCalling(false);
    }
  };

  const handleHangup = () => {
    setCallStatus('ended');
    setTimeout(() => {
      setCallStatus('idle');
      setCallControlId(null);
    }, 1500);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.phoneIcon}>
              <IconPhone size={18} color="#0B57D0" />
            </div>
            <div>
              <h3 style={styles.title}>Telnyx Voice Telephony</h3>
              <p style={styles.subtitle}>Direct Outbound Cellular Gateway</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <IconClose size={18} color="#444746" />
          </button>
        </div>

        {/* Display / Input */}
        <div style={styles.displayArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconIndiaFlag size={20} />
            <span style={styles.countryCode}>+91</span>
          </div>
          <span style={styles.numberDisplay}>
            {phoneNumber ? `${phoneNumber.slice(0, 5)} ${phoneNumber.slice(5)}` : 'Enter Number'}
          </span>
          {phoneNumber && callStatus === 'idle' && (
            <button style={styles.backspaceBtn} onClick={handleBackspace}>
              <IconClose size={16} color="#747775" />
            </button>
          )}
        </div>

        {/* Call Status HUD */}
        {callStatus !== 'idle' && (
          <div style={styles.hudCard}>
            <div style={styles.hudRow}>
              <span style={styles.hudDot}></span>
              <span style={styles.hudState}>
                {callStatus === 'calling' && 'Initiating Outbound Telnyx Call...'}
                {callStatus === 'active' && 'Call Connected (IVR Speaking)'}
                {callStatus === 'ended' && 'Call Completed'}
              </span>
            </div>
            {callControlId && (
              <span style={styles.callIdText}>Control ID: {callControlId.slice(0, 24)}...</span>
            )}
          </div>
        )}

        {errorMsg && (
          <div style={styles.errorBox}>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div style={styles.keypadGrid}>
          {[
            { digit: '1', sub: 'New User' },
            { digit: '2', sub: 'Reset PW' },
            { digit: '3', sub: 'DEF' },
            { digit: '4', sub: 'GHI' },
            { digit: '5', sub: 'JKL' },
            { digit: '6', sub: 'MNO' },
            { digit: '7', sub: 'PQRS' },
            { digit: '8', sub: 'TUV' },
            { digit: '9', sub: 'Replay' },
            { digit: '*', sub: '' },
            { digit: '0', sub: '+' },
            { digit: '#', sub: '' },
          ].map((item) => (
            <button
              key={item.digit}
              style={styles.keyBtn}
              onClick={() => handleDigitPress(item.digit)}
            >
              <span style={styles.keyDigit}>{item.digit}</span>
              {item.sub && <span style={styles.keySub}>{item.sub}</span>}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.actionRow}>
          {callStatus === 'active' || callStatus === 'calling' ? (
            <button style={styles.hangupBtn} onClick={handleHangup}>
              <span>End Call</span>
            </button>
          ) : (
            <button
              style={{
                ...styles.callBtn,
                opacity: phoneNumber.length === 10 && !calling ? 1 : 0.6,
              }}
              disabled={phoneNumber.length !== 10 || calling}
              onClick={handleStartCall}
            >
              <IconPhone size={16} color="#FFFFFF" />
              <span>{calling ? 'Connecting...' : 'Place Call'}</span>
            </button>
          )}
        </div>

        {/* DTMF Quick Guide */}
        <div style={styles.guideBox}>
          <span style={styles.guideTitle}>IVR Speech Menu Options:</span>
          <div style={styles.guideChips}>
            <span style={styles.guideChip}><strong>1:</strong> Create Account</span>
            <span style={styles.guideChip}><strong>2:</strong> Reset Password</span>
            <span style={styles.guideChip}><strong>9:</strong> Repeat Menu</span>
          </div>
        </div>

      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '12px',
    boxSizing: 'border-box',
  },
  modal: {
    width: '100%',
    maxWidth: '420px',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#FFFFFF',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    border: '1px solid var(--border-subtle)',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  phoneIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--accent-cyan-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  closeBtn: {
    fontSize: '18px',
    color: 'var(--text-muted)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayArea: {
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: '10px',
  },
  countryCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--accent-cyan)',
  },
  numberDisplay: {
    fontFamily: 'var(--font-mono)',
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '0.05em',
  },
  backspaceBtn: {
    position: 'absolute',
    right: '16px',
    fontSize: '18px',
    color: 'var(--text-muted)',
  },
  hudCard: {
    background: 'var(--accent-cyan-light)',
    border: '1px solid rgba(2, 132, 199, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'center',
  },
  hudRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  hudDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--accent-cyan)',
    animation: 'pulseGlow 1.5s infinite',
  },
  hudState: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--accent-cyan)',
  },
  callIdText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  errorBox: {
    background: 'var(--danger-light)',
    border: '1px solid rgba(220, 38, 38, 0.2)',
    color: 'var(--danger)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
    textAlign: 'center',
  },
  keypadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  keyBtn: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-xs)',
    transition: 'background-color var(--transition-fast), transform var(--transition-fast)',
  },
  keyDigit: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  keySub: {
    fontSize: '9px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginTop: '2px',
    letterSpacing: '0.04em',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  callBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    color: '#FFFFFF',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px',
    fontWeight: '700',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
    cursor: 'pointer',
  },
  hangupBtn: {
    width: '100%',
    padding: '14px',
    background: 'var(--danger)',
    color: '#FFFFFF',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  guideBox: {
    background: 'var(--bg-subtle)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  guideTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  guideChips: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  guideChip: {
    fontSize: '11px',
    background: '#FFFFFF',
    border: '1px solid var(--border-subtle)',
    padding: '3px 8px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
  },
};
