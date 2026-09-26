/**
 * File: LoginSplashScreen.tsx
 * Role: Animated splash screen shown for ~1.6 seconds upon successful login.
 *       Features the Syscall logo in the middle with mail envelopes converging inward from all directions.
 * Service: Frontend.
 */
import React, { useEffect, useState } from 'react';
import { SyscallLogo } from '../Logo';

interface LoginSplashScreenProps {
  onFinish: () => void;
}

interface FlyingMail {
  id: number;
  angleDeg: number;
  distance: number;
  delayMs: number;
  durationMs: number;
  scale: number;
}

// 16 envelopes positioned around 360 degrees flying into the central logo from farther out
const FLYING_MAILS: FlyingMail[] = [
  { id: 1, angleDeg: 0, distance: 700, delayMs: 0, durationMs: 980, scale: 1 },
  { id: 2, angleDeg: 25, distance: 760, delayMs: 120, durationMs: 940, scale: 0.9 },
  { id: 3, angleDeg: 50, distance: 680, delayMs: 240, durationMs: 920, scale: 1.1 },
  { id: 4, angleDeg: 90, distance: 640, delayMs: 60, durationMs: 960, scale: 1 },
  { id: 5, angleDeg: 115, distance: 740, delayMs: 180, durationMs: 930, scale: 0.95 },
  { id: 6, angleDeg: 145, distance: 690, delayMs: 300, durationMs: 900, scale: 1.05 },
  { id: 7, angleDeg: 180, distance: 730, delayMs: 40, durationMs: 990, scale: 1 },
  { id: 8, angleDeg: 205, distance: 710, delayMs: 160, durationMs: 940, scale: 0.9 },
  { id: 9, angleDeg: 235, distance: 770, delayMs: 280, durationMs: 910, scale: 1.1 },
  { id: 10, angleDeg: 270, distance: 640, delayMs: 80, durationMs: 970, scale: 1 },
  { id: 11, angleDeg: 295, distance: 750, delayMs: 200, durationMs: 930, scale: 0.95 },
  { id: 12, angleDeg: 330, distance: 720, delayMs: 320, durationMs: 900, scale: 1.05 },
  // Second wave from outer horizons
  { id: 13, angleDeg: 12, distance: 840, delayMs: 360, durationMs: 890, scale: 0.85 },
  { id: 14, angleDeg: 102, distance: 800, delayMs: 440, durationMs: 870, scale: 0.85 },
  { id: 15, angleDeg: 192, distance: 850, delayMs: 390, durationMs: 880, scale: 0.85 },
  { id: 16, angleDeg: 282, distance: 810, delayMs: 430, durationMs: 890, scale: 0.85 },
];

export const LoginSplashScreen: React.FC<LoginSplashScreenProps> = ({ onFinish }) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Begin smooth fade-out at 1350ms
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 1350);

    // Conclude splash and mount inbox at 1650ms (within 1 to 2 seconds)
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 1650);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div style={styles.centerStage}>
        {/* Converging Mail Envelopes from all directions */}
        {FLYING_MAILS.map((mail) => {
          const rad = (mail.angleDeg * Math.PI) / 180;
          const startX = Math.round(Math.cos(rad) * mail.distance);
          const startY = Math.round(Math.sin(rad) * mail.distance);

          return (
            <div
              key={mail.id}
              className="splash-flying-envelope"
              style={
                {
                  '--start-x': `${startX}px`,
                  '--start-y': `${startY}px`,
                  '--anim-delay': `${mail.delayMs}ms`,
                  '--anim-duration': `${mail.durationMs}ms`,
                  '--scale': mail.scale,
                } as React.CSSProperties
              }
            >
              <svg
                width="34"
                height="26"
                viewBox="0 0 24 24"
                fill="#EDF4FE"
                stroke="#0B57D0"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={styles.envelopeSvg}
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          );
        })}

        {/* Central Logo */}
        <div style={styles.logoAnchor} className="splash-logo-pulse">
          <SyscallLogo size={88} />
        </div>

        {/* Brand Name & Loading Indicator */}
        <div style={styles.brandTitleWrap}>
          <h2 style={styles.brandTitle}>Syscall</h2>
          <span style={styles.brandSubtitle}>Opening your mailbox...</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  centerStage: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  logoAnchor: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    zIndex: 10,
  },
  envelopeSvg: {
    filter: 'drop-shadow(0 2px 6px rgba(11, 87, 208, 0.2))',
  },
  brandTitleWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '20px',
    zIndex: 10,
  },
  brandTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 700,
    color: '#0B57D0',
    letterSpacing: '-0.4px',
    margin: 0,
  },
  brandSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: '#5E6674',
    fontWeight: 500,
  },
};
