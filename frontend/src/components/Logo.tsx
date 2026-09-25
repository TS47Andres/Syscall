import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Unique Syscall Mail Brandmark
 * Combines Gmail's folded-envelope origami aesthetic with a cellular handset arc and @niti loop
 */
export const SyscallLogo: React.FC<LogoProps> = ({ size = 36, style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id="envelopeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="envelopeRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="foldFlap" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1E293B" floodOpacity="0.15" />
        </filter>
      </defs>

      <g filter="url(#logoShadow)">
        {/* Left Envelope Wing / Handset Base */}
        <path
          d="M18 34C18 29.5817 21.5817 26 26 26H50V74H26C21.5817 74 18 70.4183 18 66V34Z"
          fill="url(#envelopeLeft)"
        />

        {/* Right Envelope Wing / Handset Receiver */}
        <path
          d="M50 26H74C78.4183 26 82 29.5817 82 34V66C82 70.4183 78.4183 74 74 74H50V26Z"
          fill="url(#envelopeRight)"
        />

        {/* Dynamic V-Fold Envelope Flap forming Phone Arc */}
        <path
          d="M18 28L47.2 52.8C48.8 54.2 51.2 54.2 52.8 52.8L82 28L50 56L18 28Z"
          fill="url(#foldFlap)"
          fillOpacity="0.95"
        />

        {/* Phone Receiver Loop Accent */}
        <path
          d="M38 64C38 64 43 68 50 68C57 68 62 64 62 64"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Cellular Signal Arcs Radiating at Top Right */}
        <path
          d="M74 16C80 20 85 26 87 33"
          stroke="#06B6D4"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M66 10C76 14 84 22 88 33"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />

        {/* Central Verified Notification Node */}
        <circle cx="50" cy="46" r="3.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
};
