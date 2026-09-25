import React, { useRef, useState } from 'react';
import type { User } from '../../types';
import { getInitials } from '../../types';
import {
  IconArrowBack,
  IconShieldCheck,
  IconCamera,
  IconCheck,
} from '../Icons';

interface DedicatedProfilePageProps {
  currentUser: User;
  onUpdateName: (newName: string) => void;
  onUpdatePhoto: (photoUrl: string) => void;
  onSignOut: () => void;
  onBackToMail: () => void;
}

export const DedicatedProfilePage: React.FC<DedicatedProfilePageProps> = ({
  currentUser,
  onUpdateName,
  onUpdatePhoto,
  onSignOut,
  onBackToMail,
}) => {
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingName, setEditingName] = useState<string>(currentUser.name || 'Akshat Joshi');
  const [nameSavedSuccess, setNameSavedSuccess] = useState<boolean>(false);
  const [isCopiedAddress, setIsCopiedAddress] = useState<boolean>(false);

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const rawResult = reader.result;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            onUpdatePhoto(compressed);
          } else {
            onUpdatePhoto(rawResult);
          }
        };
        img.src = rawResult;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = () => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    onUpdateName(trimmed);
    setNameSavedSuccess(true);
    setTimeout(() => setNameSavedSuccess(false), 2500);
  };

  const handleCopyAddress = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUser.emailAddress);
    }
    setIsCopiedAddress(true);
    setTimeout(() => setIsCopiedAddress(false), 2000);
  };

  return (
    <section style={styles.profileDedicatedPage} className="no-scrollbar">
      {/* Top Return Bar */}
      <div style={styles.profileTopBar}>
        <button
          style={styles.profileBackBtn}
          onClick={onBackToMail}
          title="Return to Mailbox"
        >
          <IconArrowBack size={18} color="#0B57D0" />
          <span>Back to Mail</span>
        </button>

        <span style={styles.profileTopBadge}>
          <IconShieldCheck size={14} color="#146C2E" />
          <span>Syscall Identity Protection Active</span>
        </span>
      </div>

      {/* Profile Content Container */}
      <div style={styles.profileContentCard}>
        {/* Header Title */}
        <div style={styles.profileHeroSection}>
          <div style={styles.profileAvatarLargeWrapper}>
            <div
              style={styles.profileAvatarLarge}
              onClick={() => profileFileInputRef.current?.click()}
              title="Click to change profile picture"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                getInitials(currentUser.name)
              )}
              <div style={styles.avatarCameraBadge}>
                <IconCamera size={14} color="#FFFFFF" />
              </div>
            </div>
            <input
              ref={profileFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleProfilePhotoChange}
            />
            <button
              style={styles.changePhotoTextBtn}
              onClick={() => profileFileInputRef.current?.click()}
            >
              Change profile photo
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <h1 style={styles.profileMainTitle}>{currentUser.name || 'Akshat Joshi'}</h1>
            <p style={styles.profileSubtitle}>Manage your Indian PhoneMail identity, credentials, and security</p>
          </div>
        </div>

        {/* Editable Name Card */}
        <div style={styles.profileInfoSection}>
          <div style={styles.profileFieldGroup}>
            <label style={styles.profileFieldLabel}>Display Name</label>
            <div style={styles.profileInputRow}>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Your full name"
                style={styles.profileTextInput}
              />
              <button
                style={styles.profileSaveBtn}
                onClick={handleSaveName}
              >
                Save Name
              </button>
            </div>
            {nameSavedSuccess && (
              <span style={styles.profileSuccessToast}>
                <IconCheck size={14} color="#146C2E" />
                <span>Name updated successfully!</span>
              </span>
            )}
          </div>

          {/* PhoneMail Address Card */}
          <div style={styles.profileFieldGroup}>
            <label style={styles.profileFieldLabel}>Your PhoneMail Address</label>
            <div style={styles.addressDisplayBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <span style={styles.addressMonoText}>{currentUser.emailAddress}</span>
                <span style={styles.verifiedAddressPill}>
                  <IconCheck size={12} color="#146C2E" />
                  <span>Verified</span>
                </span>
              </div>
              <button
                style={styles.copyAddressBtn}
                onClick={handleCopyAddress}
              >
                {isCopiedAddress ? 'Copied!' : 'Copy Address'}
              </button>
            </div>
            <span style={styles.profileFieldHint}>
              Official Indian PhoneMail format tied to your mobile number +91 {currentUser.phone}.
            </span>
          </div>

          {/* Telecom Number & Antivirus Info */}
          <div style={styles.profileGridTwoCol}>
            <div style={styles.profileMetricCard}>
              <span style={styles.metricLabel}>Mobile Carrier Number</span>
              <span style={styles.metricValue}>+91 {currentUser.phone}</span>
              <span style={styles.metricStatus}>Telecom OTP-Linked</span>
            </div>

            <div style={styles.profileMetricCard}>
              <span style={styles.metricLabel}>Antivirus Engine</span>
              <span style={styles.metricValue}>ClamAV 1.4 Active</span>
              <span style={styles.metricStatusGreen}>Protected Real-Time</span>
            </div>
          </div>

          {/* Account Actions */}
          <div style={styles.profileActionsRow}>
            <button
              style={styles.profileSignOutBtn}
              onClick={onSignOut}
            >
              Sign out of Syscall
            </button>

            <button
              style={styles.profileReturnBtn}
              onClick={onBackToMail}
            >
              Return to Mailbox
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const styles: Record<string, React.CSSProperties> = {
  profileDedicatedPage: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    margin: '0 16px 16px 0',
    overflowY: 'auto',
    boxShadow: '0 1px 3px rgba(60,64,67,0.06)',
    minWidth: 0,
    padding: '24px 32px',
  },
  profileTopBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid #F1F3F4',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  profileBackBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: '#EAF1FB',
    color: '#0B57D0',
    fontWeight: 600,
    fontSize: '13.5px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s ease',
  },
  profileTopBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '14px',
    backgroundColor: '#ECFDF5',
    color: '#146C2E',
    fontSize: '12px',
    fontWeight: 600,
  },
  profileContentCard: {
    maxWidth: '680px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  profileHeroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0 10px',
  },
  profileAvatarLargeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  profileAvatarLarge: {
    position: 'relative',
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontSize: '32px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(11, 87, 208, 0.2)',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: '#1F1F1F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #FFFFFF',
  },
  changePhotoTextBtn: {
    fontSize: '13px',
    color: '#0B57D0',
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  profileMainTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '24px',
    fontWeight: 700,
    color: '#1F1F1F',
    margin: '0 0 4px 0',
  },
  profileSubtitle: {
    fontSize: '13.5px',
    color: '#747775',
    margin: 0,
  },
  profileInfoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  profileFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#F8FAFD',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #EDF2FA',
  },
  profileFieldLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#444746',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  profileInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  profileTextInput: {
    flex: 1,
    height: '42px',
    padding: '0 14px',
    borderRadius: '8px',
    border: '1px solid #D3E3FD',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    color: '#1F1F1F',
    fontWeight: 500,
    outline: 'none',
  },
  profileSaveBtn: {
    height: '42px',
    padding: '0 18px',
    borderRadius: '8px',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  profileSuccessToast: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12.5px',
    color: '#146C2E',
    fontWeight: 600,
    marginTop: '4px',
  },
  addressDisplayBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backgroundColor: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #E0E2EC',
  },
  addressMonoText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0B57D0',
  },
  verifiedAddressPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#146C2E',
    backgroundColor: '#ECFDF5',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  copyAddressBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: '#F1F3F4',
    color: '#1F1F1F',
    fontWeight: 600,
    fontSize: '12px',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  profileFieldHint: {
    fontSize: '12px',
    color: '#747775',
  },
  profileGridTwoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
  },
  profileMetricCard: {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#F8FAFD',
    border: '1px solid #EDF2FA',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '11.5px',
    color: '#747775',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1F1F1F',
  },
  metricStatus: {
    fontSize: '12px',
    color: '#0B57D0',
    fontWeight: 600,
  },
  metricStatusGreen: {
    fontSize: '12px',
    color: '#146C2E',
    fontWeight: 600,
  },
  profileActionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '16px',
    borderTop: '1px solid #F1F3F4',
    flexWrap: 'wrap',
    gap: '12px',
  },
  profileSignOutBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: '#FCE8E6',
    color: '#C5221F',
    fontWeight: 600,
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
  },
  profileReturnBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
  },
};
