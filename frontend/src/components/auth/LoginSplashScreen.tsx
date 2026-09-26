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

const SPOKE_COUNT = 24;
const MAILS_PER_SPOKE = 5;
const MAIL_ROW_SPACING = 48;
const MAIL_SPEED_PX_PER_MS = 0.25;
const SPOKES = Array.from({ length: SPOKE_COUNT }, (_, spoke) => ({
  id: spoke,
  angleDeg: -90 + (360 / SPOKE_COUNT) * spoke,
}));

// Five envelopes travel along each of 24 evenly spaced spokes and disappear into the logo.
const FLYING_MAILS: FlyingMail[] = SPOKES.flatMap(({ id: spoke, angleDeg }) =>
  Array.from({ length: MAILS_PER_SPOKE }, (_, mailIndex) => ({
    id: spoke * MAILS_PER_SPOKE + mailIndex,
    angleDeg,
    distance: 220 + mailIndex * MAIL_ROW_SPACING,
    delayMs: 0,
    durationMs: Math.round((220 + mailIndex * MAIL_ROW_SPACING) / MAIL_SPEED_PX_PER_MS),
    scale: 0.76 + (mailIndex % 2) * 0.08,
  }))
);

export const LoginSplashScreen: React.FC<LoginSplashScreenProps> = ({ onFinish }) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Let the final envelopes reach and disappear into the logo before fading the splash.
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 1950);

    // Conclude splash and mount inbox after the logo absorption animation.
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2250);

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
        {/* Five envelopes travel in along each invisible spoke and enter the logo */}
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
                width="28"
                height="22"
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
        <div style={styles.logoAnchor} className="splash-logo-absorb">
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
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: '-60px',
    marginLeft: '-60px',
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
    position: 'absolute',
    top: 'calc(50% + 80px)',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: 0,
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
