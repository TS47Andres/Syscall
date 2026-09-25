import React from 'react';

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export const getPasswordStrength = (pwd: string): PasswordStrength => {
  if (!pwd) return { score: 0, label: '', color: '#E0E2EC' };
  if (pwd.length < 6) return { score: 1, label: 'Too short', color: '#DC2626' };

  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#DC2626' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#E37400' };
  if (score === 3) return { score: 3, label: 'Good', color: '#0B57D0' };
  return { score: 4, label: 'Strong', color: '#137333' };
};

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ strength }) => {
  if (!strength.label) return null;

  return (
    <div style={styles.meterContainer}>
      <div style={styles.barTrack}>
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            style={{
              ...styles.barSegment,
              backgroundColor: strength.score >= step ? strength.color : '#E0E2EC',
            }}
          />
        ))}
      </div>
      <span style={{ ...styles.label, color: strength.color }}>
        {strength.label}
      </span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  meterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  barTrack: {
    display: 'flex',
    gap: '4px',
    flex: 1,
    height: '4px',
  },
  barSegment: {
    flex: 1,
    borderRadius: '2px',
    transition: 'background-color 0.2s ease',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    minWidth: '55px',
    textAlign: 'right',
  },
};
