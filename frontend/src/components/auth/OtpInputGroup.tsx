import React, { useRef, useState } from 'react';

interface OtpInputGroupProps {
  otpDigits: string[];
  onChangeDigits: (digits: string[]) => void;
  onComplete?: (otp: string) => void;
  onEnter?: () => void;
}

export const OtpInputGroup: React.FC<OtpInputGroupProps> = ({
  otpDigits,
  onChangeDigits,
  onComplete,
  onEnter,
}) => {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    onChangeDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5 && newDigits.every((d) => d !== '')) {
      if (onComplete) onComplete(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onEnter) onEnter();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasteData[i] || '';
    }
    onChangeDigits(newDigits);
    const lastFilled = Math.min(pasteData.length, 5);
    inputRefs.current[lastFilled]?.focus();

    if (pasteData.length === 6 && onComplete) {
      onComplete(pasteData);
    }
  };

  return (
    <div style={styles.otpBoxesRow} onPaste={handleOtpPaste}>
      {/* First 3 Digits */}
      <div style={styles.otpGroup}>
        {[0, 1, 2].map((idx) => {
          const digit = otpDigits[idx];
          const isFocused = focusedIdx === idx;
          return (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onFocus={() => setFocusedIdx(idx)}
              onBlur={() => setFocusedIdx(null)}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              style={{
                ...styles.otpBoxInput,
                borderColor: isFocused ? '#0B57D0' : digit ? '#0B57D0' : '#DADCE0',
                backgroundColor: isFocused ? '#F0F4F9' : digit ? '#F8FAFD' : '#FFFFFF',
                boxShadow: isFocused ? '0 0 0 3px rgba(11, 87, 208, 0.15)' : 'none',
              }}
              autoFocus={idx === 0}
            />
          );
        })}
      </div>

      {/* Divider */}
      <span style={styles.otpDivider}>–</span>

      {/* Last 3 Digits */}
      <div style={styles.otpGroup}>
        {[3, 4, 5].map((idx) => {
          const digit = otpDigits[idx];
          const isFocused = focusedIdx === idx;
          return (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onFocus={() => setFocusedIdx(idx)}
              onBlur={() => setFocusedIdx(null)}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              style={{
                ...styles.otpBoxInput,
                borderColor: isFocused ? '#0B57D0' : digit ? '#0B57D0' : '#DADCE0',
                backgroundColor: isFocused ? '#F0F4F9' : digit ? '#F8FAFD' : '#FFFFFF',
                boxShadow: isFocused ? '0 0 0 3px rgba(11, 87, 208, 0.15)' : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  otpBoxesRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
  },
  otpGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  otpBoxInput: {
    width: '42px',
    height: '48px',
    borderRadius: '8px',
    border: '1.5px solid #DADCE0',
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: 700,
    color: '#1F1F1F',
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  otpDivider: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#747775',
    userSelect: 'none',
  },
};
