/**
 * File: AuthBrandPanel.tsx
 * Role: Right showcase panel for login screen featuring 5-second timed rotating images
 *       with smooth slide transitions and an expanding animated real-time progress pill.
 * Service: Frontend.
 */
import React, { useState, useEffect } from 'react';
import emailingImg from '../../assets/showcase/Emailing.png';
import scheduleEmailsImg from '../../assets/showcase/Schedule_Emails.png';
import manageProfileImg from '../../assets/showcase/Manage_Profile.png';
import clamavImg from '../../assets/showcase/ClamAV_Virus_Protection.png';

interface ShowcaseSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
}

const SLIDES: ShowcaseSlide[] = [
  {
    id: 'emailing',
    image: emailingImg,
    title: 'Phone-Linked Emailing',
    subtitle: 'Send and receive official emails tied directly to your verified Indian mobile number',
  },
  {
    id: 'schedule',
    image: scheduleEmailsImg,
    title: 'Precision Scheduling',
    subtitle: 'Schedule important emails with millisecond delivery precision and custom calendar times',
  },
  {
    id: 'profile',
    image: manageProfileImg,
    title: 'Telecom Identity & Profile',
    subtitle: 'Carrier-verified profile security, custom avatar, and instant recovery management',
  },
  {
    id: 'clamav',
    image: clamavImg,
    title: 'Active ClamAV Virus Protection',
    subtitle: 'Enterprise-grade antivirus daemon actively scanning every attached file in real time',
  },
];

const ROTATION_INTERVAL_MS = 5000;

export const AuthBrandPanel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleSelectSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div
      style={styles.authRightPanel}
      className="auth-right-panel desktop-only"
      id="auth-right-space"
    >
      <div style={styles.carouselContainer}>
        {/* Carousel Image Cards */}
        <div style={styles.slidesStage}>
          {SLIDES.map((slide, index) => {
            const isActive = index === currentIndex;
            const isPrev = index === (currentIndex - 1 + SLIDES.length) % SLIDES.length;

            return (
              <div
                key={slide.id}
                style={{
                  ...styles.slideItem,
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? 'translateX(0) scale(1)'
                    : isPrev
                    ? 'translateX(-40px) scale(0.96)'
                    : 'translateX(40px) scale(0.96)',
                  pointerEvents: isActive ? 'auto' : 'none',
                  zIndex: isActive ? 2 : 1,
                }}
              >
                <div style={styles.imageCard}>
                  <img
                    src={slide.image}
                    alt={slide.title}
                    style={styles.slideImage}
                    draggable={false}
                  />
                </div>

                <div style={styles.captionWrap}>
                  <h3 style={styles.captionTitle}>{slide.title}</h3>
                  <p style={styles.captionSubtitle}>{slide.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Navigation Bubbles & Expanding Progress Pill */}
        <div style={styles.indicatorTrack}>
          {SLIDES.map((slide, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => handleSelectSlide(index)}
                style={{
                  ...styles.bubbleBtn,
                  width: isActive ? '36px' : '9px',
                  borderRadius: isActive ? '5px' : '50%',
                  backgroundColor: isActive ? '#E2E8F0' : '#CBD5E1',
                }}
                title={slide.title}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
              >
                {isActive && (
                  <div
                    key={`pill-fill-${currentIndex}`}
                    className="carousel-pill-fill"
                    style={{
                      height: '100%',
                      backgroundColor: '#0B57D0',
                      borderRadius: '5px',
                      animation: `carouselPillFill ${ROTATION_INTERVAL_MS}ms linear forwards`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  authRightPanel: {
    flex: 1,
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '20px 28px',
    background: 'linear-gradient(145deg, #F8FAFD 0%, #EEF4FC 100%)',
  },
  carouselContainer: {
    width: '94%',
    maxWidth: '1080px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  },
  slidesStage: {
    position: 'relative',
    width: '100%',
    height: 'min(840px, 76vh)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideItem: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  imageCard: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    borderRadius: '26px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 28px 64px -14px rgba(11, 87, 208, 0.16), 0 10px 30px -4px rgba(0, 0, 0, 0.08)',
    border: '1px solid #E0E7F5',
  },
  slideImage: {
    maxWidth: '100%',
    maxHeight: 'min(660px, 64vh)',
    borderRadius: '16px',
    objectFit: 'contain',
    display: 'block',
  },
  captionWrap: {
    textAlign: 'center',
    marginTop: '16px',
    maxWidth: '740px',
  },
  captionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: 700,
    color: '#041E49',
    marginBottom: '6px',
    letterSpacing: '-0.2px',
  },
  captionSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: '#444746',
    lineHeight: 1.45,
    margin: 0,
  },
  indicatorTrack: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  bubbleBtn: {
    height: '10px',
    padding: 0,
    border: 'none',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, border-radius 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
};
