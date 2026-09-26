/**
 * File: DedicatedProfilePage.tsx
 * Role: Edits persisted profile fields and displays backend account state.
 * Service: Frontend.
 */
import React, { useRef, useState } from 'react';
import type { User } from '../../types';
import { getInitials } from '../../types';
import {
  IconArrowBack,
  IconShieldCheck,
  IconCamera,
  IconCheck,
  IconInfo,
} from '../Icons';
import { getCarrierInfo } from '../../utils/carrierLookup';

interface DedicatedProfilePageProps {
  currentUser: User;
  onUpdateName: (newName: string) => Promise<void>;
  onUpdatePhoto: (photoUrl: string) => Promise<void>;
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
  const [editingName, setEditingName] = useState<string>(currentUser.name || '');
  const [nameSavedSuccess, setNameSavedSuccess] = useState<boolean>(false);
  const [isCopiedAddress, setIsCopiedAddress] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const carrierInfo = getCarrierInfo(currentUser.phone);

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
            void onUpdatePhoto(compressed).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : 'Could not update profile photo.'));
          } else {
            void onUpdatePhoto(rawResult).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : 'Could not update profile photo.'));
          }
        };
        img.src = rawResult;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async () => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    try {
      await onUpdateName(trimmed);
      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 2500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update display name.');
    }
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
      {/* Sticky Top Return Bar */}
      <div style={styles.profileTopBar}>
        <button
          style={styles.profileBackBtn}
          onClick={onBackToMail}
          title="Return to Mailbox"
        >
          <IconArrowBack size={18} color="#0B57D0" />
          <span>Back to Mail</span>
        </button>
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
            <h1 style={styles.profileMainTitle}>{currentUser.name || 'Syscall account'}</h1>
            <p style={styles.profileSubtitle}>Manage your Indian Syscall identity, credentials, and security</p>
          </div>
        </div>
        {errorMessage && <div role="alert" style={styles.profileError}>{errorMessage}</div>}

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

          {/* Syscall address card */}
          <div style={styles.profileFieldGroup}>
            <label style={styles.profileFieldLabel}>Your Syscall Address</label>
            <div style={styles.addressDisplayBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <span style={styles.addressMonoText}>{currentUser.emailAddress}</span>
                <span
                  title="Verified Syscall Address"
                  data-tooltip="Verified Syscall Address"
                  style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
                >
                  <IconShieldCheck size={18} color="#146C2E" />
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
              Official Indian Syscall format tied to your mobile number +91 {currentUser.phone}.
            </span>
          </div>

          {/* Telecom Number & Carrier Information */}
          <div style={styles.profileFieldGroup}>
            <span style={styles.profileFieldLabel}>Mobile Carrier Number</span>

            <div style={styles.carrierInfoRow}>
              <span style={styles.carrierPhoneText}>
                {carrierInfo.formattedNumber || `+91 ${currentUser.phone}`}
              </span>

              {carrierInfo.carrier && (
                <div style={styles.carrierBadge}>
                  {carrierInfo.brandLogo && (
                    <img
                      src={carrierInfo.brandLogo}
                      alt={carrierInfo.carrier}
                      style={styles.carrierLogoImg}
                    />
                  )}
                  <span style={styles.carrierNameText}>
                    {carrierInfo.carrier}
                  </span>
                  <span
                    title="It can only show original carrier and may show wrong carrier for ported SIMs."
                    data-tooltip="It can only show original carrier and may show wrong carrier for ported SIMs."
                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
                  >
                    <IconInfo size={14} color="#0B57D0" />
                  </span>
                </div>
              )}
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
    padding: '16px 32px 32px 32px',
    position: 'relative',
  },
  profileTopBar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '8px',
    paddingBottom: '16px',
    borderBottom: 'none',
    marginBottom: '20px',
  },
  profileBackBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px 8px 0',
    borderRadius: '20px',
    backgroundColor: 'transparent',
    background: 'none',
    color: '#0B57D0',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s ease',
  },
  profileContentCard: {
    maxWidth: '680px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  profileHeroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 0 6px',
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
    gap: '18px',
  },
  profileFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '18px',
    border: '1px solid #E0E2EC',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
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
  profileError: {
    margin: '12px 24px',
    padding: '10px 14px',
    color: '#A12622',
    background: '#FFF1F0',
    borderRadius: 8,
  },
  addressDisplayBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backgroundColor: '#F8FAFD',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #D3E3FD',
  },
  addressMonoText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14.5px',
    fontWeight: 600,
    color: '#0B57D0',
  },
  copyAddressBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #DADCE0',
    color: '#1F1F1F',
    fontWeight: 600,
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  profileFieldHint: {
    fontSize: '12px',
    color: '#747775',
  },
  carrierInfoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    paddingTop: '2px',
  },
  carrierPhoneText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '15px',
    fontWeight: 700,
    color: '#1F1F1F',
  },
  carrierBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    backgroundColor: '#F0F4FC',
    border: '1px solid #D3E3FD',
    padding: '3px 10px 3px 6px',
    borderRadius: '16px',
  },
  carrierLogoImg: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    objectFit: 'contain',
    backgroundColor: '#FFFFFF',
    padding: '1px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
  },
  carrierNameText: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#041E49',
  },
  profileActionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '12px',
    borderTop: '1px solid #F1F3F4',
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
    transition: 'background-color 0.15s ease',
  },
};
