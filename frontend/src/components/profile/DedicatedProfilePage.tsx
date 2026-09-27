/**
 * File: DedicatedProfilePage.tsx
 * Role: Modern borderless profile page with Flatpickr DOB selector, gender dropdown, and compact searchable language dropdown.
 * Service: Frontend.
 */
import React, { useRef, useState, useEffect } from 'react';
import flatpickr from 'flatpickr';
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
import 'flatpickr/dist/flatpickr.min.css';
import type { User } from '../../types';
import { getInitials } from '../../types';
import {
  IconArrowBack,
  IconShieldCheck,
  IconCamera,
  IconCheck,
  IconInfo,
  IconLanguage,
  IconCalendar,
  IconClose,
  IconSearch,
} from '../Icons';
import { getCarrierInfo } from '../../utils/carrierLookup';
import { SUPPORTED_LANGUAGES, t } from '../../utils/i18n';

interface DedicatedProfilePageProps {
  currentUser: User;
  onUpdateName: (newName: string) => Promise<void>;
  onUpdatePhoto: (photoUrl: string) => Promise<void>;
  onUpdateProfileDetails?: (details: {
    name?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
    dateOfBirth?: string | null;
    language?: string;
  }) => Promise<void>;
  onSignOut: () => void;
  onBackToMail: () => void;
  isSearchFilterOpen?: boolean;
}

const GENDER_OPTIONS: Array<{
  value: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  label: string;
}> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

/**
 * Calculates human-readable age from ISO date string (YYYY-MM-DD).
 */
const calculateAge = (dobString: string | null | undefined): number | null => {
  if (!dobString) return null;
  const parts = dobString.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

export const DedicatedProfilePage: React.FC<DedicatedProfilePageProps> = ({
  currentUser,
  onUpdateName,
  onUpdatePhoto,
  onUpdateProfileDetails,
  onSignOut,
  onBackToMail,
  isSearchFilterOpen = false,
}) => {
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);

  // Display name state
  const [editingName, setEditingName] = useState<string>(currentUser.name || '');
  const [nameSavedSuccess, setNameSavedSuccess] = useState<boolean>(false);
  const [savingName, setSavingName] = useState<boolean>(false);

  // Gender state & dropdown
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | null>(
    currentUser.gender ?? null
  );
  const [genderDropdownOpen, setGenderDropdownOpen] = useState<boolean>(false);
  const genderDropdownRef = useRef<HTMLDivElement | null>(null);

  // Flatpickr Date of Birth state (matching scheduled emails picker)
  const [dateOfBirth, setDateOfBirth] = useState<string>(currentUser.dateOfBirth || '');
  const dobInputRef = useRef<HTMLInputElement | null>(null);
  const dobPositionRef = useRef<HTMLDivElement | null>(null);
  const dobFpRef = useRef<FlatpickrInstance | null>(null);

  const [personalSavedSuccess, setPersonalSavedSuccess] = useState<boolean>(false);
  const [savingPersonal, setSavingPersonal] = useState<boolean>(false);

  // Language settings state & dropdown
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentUser.language || 'en');
  const [languageSavedSuccess, setLanguageSavedSuccess] = useState<boolean>(false);
  const [savingLanguage, setSavingLanguage] = useState<boolean>(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);
  const [langSearchQuery, setLangSearchQuery] = useState<string>('');
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  const [isCopiedAddress, setIsCopiedAddress] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize initial state when currentUser updates
  useEffect(() => {
    setEditingName(currentUser.name || '');
    setSelectedGender(currentUser.gender ?? null);
    setDateOfBirth(currentUser.dateOfBirth || '');
    setSelectedLanguage(currentUser.language || 'en');
  }, [currentUser]);

  // Initialize Flatpickr for Date of Birth (Same architecture as ModernSchedulePicker)
  useEffect(() => {
    if (!dobInputRef.current) return;

    const fp = flatpickr(dobInputRef.current, {
      enableTime: false,
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'F j, Y',
      altInputClass: 'profile-dob-alt-input',
      appendTo: document.body,
      positionElement: dobPositionRef.current ?? undefined,
      maxDate: new Date(),
      monthSelectorType: 'dropdown',
      disableMobile: true,
      defaultDate: currentUser.dateOfBirth ? new Date(currentUser.dateOfBirth) : undefined,
      onChange: (selectedDates) => {
        if (selectedDates && selectedDates.length > 0) {
          const d = selectedDates[0];
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setDateOfBirth(`${y}-${m}-${day}`);
        } else {
          setDateOfBirth('');
        }
      },
    });

    dobFpRef.current = fp;

    return () => {
      fp.destroy();
      dobFpRef.current = null;
    };
  }, []);

  // Sync external currentUser.dateOfBirth changes into flatpickr instance
  useEffect(() => {
    if (dobFpRef.current) {
      if (currentUser.dateOfBirth) {
        dobFpRef.current.setDate(new Date(currentUser.dateOfBirth), false);
      } else {
        dobFpRef.current.clear();
      }
    }
  }, [currentUser.dateOfBirth]);

  // Close gender dropdown on outside click
  useEffect(() => {
    if (!genderDropdownOpen) return;
    const handleGenderOutside = (e: MouseEvent) => {
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(e.target as Node)) {
        setGenderDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleGenderOutside);
    return () => document.removeEventListener('pointerdown', handleGenderOutside);
  }, [genderDropdownOpen]);

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langDropdownOpen) return;
    const handleLangOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleLangOutside);
    return () => document.removeEventListener('pointerdown', handleLangOutside);
  }, [langDropdownOpen]);

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
            void onUpdatePhoto(compressed).catch((error: unknown) =>
              setErrorMessage(error instanceof Error ? error.message : 'Could not update profile photo.')
            );
          } else {
            void onUpdatePhoto(rawResult).catch((error: unknown) =>
              setErrorMessage(error instanceof Error ? error.message : 'Could not update profile photo.')
            );
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
    setSavingName(true);
    try {
      await onUpdateName(trimmed);
      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 2500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update display name.');
    } finally {
      setSavingName(false);
    }
  };

  const computedAge = calculateAge(dateOfBirth);

  const handleSavePersonal = async () => {
    setErrorMessage(null);
    setSavingPersonal(true);
    try {
      if (onUpdateProfileDetails) {
        await onUpdateProfileDetails({
          gender: selectedGender,
          dateOfBirth: dateOfBirth || null,
        });
      }
      setPersonalSavedSuccess(true);
      setTimeout(() => setPersonalSavedSuccess(false), 2500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update personal details.');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleClearDob = () => {
    if (dobFpRef.current) {
      dobFpRef.current.clear();
    }
    setDateOfBirth('');
  };

  const handleSaveLanguage = async () => {
    setErrorMessage(null);
    setSavingLanguage(true);
    try {
      if (onUpdateProfileDetails) {
        await onUpdateProfileDetails({
          language: selectedLanguage,
        });
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('syscall_language', selectedLanguage);
      }
      setLanguageSavedSuccess(true);
      setTimeout(() => setLanguageSavedSuccess(false), 2500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update language preference.');
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleCopyAddress = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUser.emailAddress);
    }
    setIsCopiedAddress(true);
    setTimeout(() => setIsCopiedAddress(false), 2000);
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const filteredLanguages = SUPPORTED_LANGUAGES.filter((l) => {
    const q = langSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      l.regionCode.toLowerCase().includes(q)
    );
  });

  const savedLang = currentUser.language || 'en';

  const selectedGenderObj = GENDER_OPTIONS.find((g) => g.value === selectedGender);
  const selectedGenderLabel = selectedGenderObj
    ? t(`gender_${selectedGenderObj.value}`, savedLang)
    : t('select_gender', savedLang);

  return (
    <section style={styles.profileDedicatedPage} className="profile-page-shell no-scrollbar">
      {/* Top Navigation Bar */}
      {!isSearchFilterOpen && (
        <div style={styles.profileTopBar} className="profile-topbar">
          <button
            style={styles.profileBackBtn}
            onClick={onBackToMail}
            title={t('back_to_mail', savedLang)}
          >
            <IconArrowBack size={18} color="#0B57D0" />
            <span>{t('back_to_mail', savedLang)}</span>
          </button>
        </div>
      )}

      {/* Main Profile Content Container */}
      <div style={styles.profileContentCard} className="profile-content-card">
        {/* Hero Section with Avatar */}
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
              {t('change_photo', savedLang)}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <h1 style={styles.profileMainTitle} className="profile-main-title">{currentUser.name || t('profile_title', savedLang)}</h1>
            <p style={styles.profileSubtitle}>{t('profile_subtitle', savedLang)}</p>
          </div>
        </div>

        {errorMessage && <div role="alert" style={styles.profileError}>{errorMessage}</div>}

        <div style={styles.profileInfoSection}>
          {/* Card 1: Display Name */}
          <div style={styles.profileCard} className="profile-card">
            <label style={styles.cardHeaderLabel}>{t('display_name', savedLang)}</label>
            <div style={styles.profileInputRow} className="profile-input-row">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder={t('name_placeholder', savedLang)}
                style={styles.profileTextInput}
              />
              <button
                style={{
                  ...styles.profileSaveBtn,
                  opacity: savingName ? 0.7 : 1,
                  cursor: savingName ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSaveName}
                disabled={savingName}
              >
                {savingName ? t('saving', savedLang) : t('save_name', savedLang)}
              </button>
            </div>
            {nameSavedSuccess && (
              <span style={styles.profileSuccessToast} className="profile-success-toast">
                <IconCheck size={14} color="#146C2E" />
                <span>{t('name_saved', savedLang)}</span>
              </span>
            )}
          </div>

          {/* Card 2: Personal Details (Gender Dropdown & Flatpickr Date of Birth) */}
          <div style={styles.profileCard} className="profile-card">
            <div style={styles.cardTitleBar}>
              <div>
                <span style={styles.cardHeaderLabel}>{t('personal_details', savedLang)}</span>
                <p style={styles.cardDescription}>
                  {t('personal_desc', savedLang)}
                </p>
              </div>
            </div>

            {/* Division 1: Gender Dropdown */}
            <div style={styles.subSectionBlock}>
              <label style={styles.subSectionTitle}>{t('gender_label', savedLang)}</label>
              <div style={{ position: 'relative', maxWidth: '260px' }} className="profile-gender-control" ref={genderDropdownRef}>
                <button
                  type="button"
                  style={styles.compactDropdownBtn}
                  onClick={() => setGenderDropdownOpen((prev) => !prev)}
                  aria-expanded={genderDropdownOpen}
                >
                  <span style={{ fontWeight: 500, color: selectedGender ? '#1F1F1F' : '#747775' }}>
                    {selectedGenderLabel}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#444746"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: genderDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {genderDropdownOpen && (
                  <div style={styles.compactDropdownMenu} className="lang-dropdown-menu profile-gender-menu">
                    {GENDER_OPTIONS.map((opt) => {
                      const isSelected = selectedGender === opt.value;
                      return (
                        <div
                          key={opt.value}
                          className="syscall-lang-item"
                          style={{
                            backgroundColor: isSelected ? '#E2E7EF' : 'transparent',
                            fontWeight: isSelected ? 600 : 500,
                          }}
                          onClick={() => {
                            setSelectedGender(opt.value);
                            setGenderDropdownOpen(false);
                          }}
                        >
                          <span style={{ color: '#1F1F1F', fontSize: '13.5px' }}>
                            {t(`gender_${opt.value}`, savedLang)}
                          </span>
                          {isSelected && <IconCheck size={14} color="#1F1F1F" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Visual Divider */}
            <div style={styles.innerCardDivider} />

            {/* Division 2: Date of Birth */}
            <div style={styles.subSectionBlock}>
              <div style={styles.dobHeaderRow} className="profile-dob-header">
                <label style={styles.subSectionTitle}>{t('choose_dob', savedLang)}</label>
                {computedAge !== null && (
                  <span style={styles.ageBadge}>
                    {t('age_label', savedLang)}: {computedAge} {computedAge === 1 ? t('age_year_old', savedLang) : t('age_years_old', savedLang)}
                  </span>
                )}
              </div>

              {/* Flatpickr DOB Bar (Neutral, No Blue Hue) */}
              <div
                ref={dobPositionRef}
                className={`profile-dob-bar ${dateOfBirth ? 'is-active' : ''}`}
                onClick={() => dobFpRef.current?.open()}
                style={styles.profileDobBar}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={styles.dobCalendarIconBadge}>
                    <IconCalendar size={18} color="#444746" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                    <span style={styles.dobBarLabel}>{t('choose_dob', savedLang)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <input
                        ref={dobInputRef}
                        type="text"
                        placeholder={`${t('choose_dob', savedLang)}...`}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                {dateOfBirth && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearDob();
                    }}
                    style={styles.dobClearBtn}
                    title={t('clear', savedLang)}
                  >
                    <IconClose size={13} color="#444746" />
                    <span>{t('clear', savedLang)}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Save Personal Details Action */}
            <div style={styles.cardFooterAction} className="profile-card-footer">
              <div>
                {personalSavedSuccess && (
                  <span style={styles.profileSuccessToast} className="profile-success-toast">
                    <IconCheck size={14} color="#146C2E" />
                    <span>{t('personal_saved', savedLang)}</span>
                  </span>
                )}
              </div>
              <button
                style={{
                  ...styles.profileSaveBtn,
                  opacity: savingPersonal ? 0.7 : 1,
                  cursor: savingPersonal ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSavePersonal}
                disabled={savingPersonal}
              >
                {savingPersonal ? t('saving', savedLang) : t('save_personal', savedLang)}
              </button>
            </div>
          </div>

          {/* Card 3: Language Settings (LIVE PREVIEW ONLY FOR THIS SECTION) */}
          <div style={styles.profileCard} className="profile-card">
            <div style={styles.cardTitleBar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconLanguage size={20} color="#1F1F1F" />
                <span style={styles.cardHeaderLabel}>{t('language_settings', selectedLanguage)}</span>
                {selectedLanguage !== savedLang && (
                  <span style={styles.previewIndicatorBadge}>
                    {t('language_preview_badge', selectedLanguage)}
                  </span>
                )}
              </div>
              <p style={styles.cardDescription}>
                {t('language_hint', selectedLanguage)}
              </p>
            </div>

            {/* Compact Language Dropdown */}
            <div style={{ position: 'relative', maxWidth: '280px', marginTop: '4px' }} className="profile-language-control" ref={langDropdownRef}>
              <button
                type="button"
                style={styles.compactDropdownBtn}
                onClick={() => {
                  setLangDropdownOpen((prev) => !prev);
                  setLangSearchQuery('');
                }}
                aria-expanded={langDropdownOpen}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={styles.compactLangBadge}>{currentLangObj.regionCode}</span>
                  <span style={styles.compactLangText}>
                    {currentLangObj.name} — {currentLangObj.nativeName}
                  </span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#444746"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: langDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {langDropdownOpen && (
                <div style={styles.compactLangMenu} className="lang-dropdown-menu profile-language-menu">
                  {/* Search Bar for Languages */}
                  <div style={styles.langSearchBox}>
                    <IconSearch size={15} color="#747775" />
                    <input
                      type="text"
                      autoFocus
                      value={langSearchQuery}
                      onChange={(e) => setLangSearchQuery(e.target.value)}
                      placeholder={t('search_languages', selectedLanguage)}
                      style={styles.langSearchInputField}
                    />
                    {langSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLangSearchQuery('')}
                        style={styles.langSearchClearBtn}
                        title={t('clear', selectedLanguage)}
                      >
                        <IconClose size={12} color="#747775" />
                      </button>
                    )}
                  </div>

                  {/* Scrollable Language List */}
                  <div style={styles.langOptionsList} className="no-scrollbar profile-language-options">
                    {filteredLanguages.length === 0 ? (
                      <div style={styles.langEmptyState}>
                        No languages matching "{langSearchQuery}"
                      </div>
                    ) : (
                      filteredLanguages.map((lang) => {
                        const isSelected = selectedLanguage === lang.code;
                        return (
                          <div
                            key={lang.code}
                            className="syscall-lang-item"
                            style={{
                              backgroundColor: isSelected ? '#E2E7EF' : 'transparent',
                              fontWeight: isSelected ? 600 : 500,
                            }}
                            onClick={() => {
                              setSelectedLanguage(lang.code);
                              setLangDropdownOpen(false);
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={styles.compactLangBadge}>{lang.regionCode}</span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', color: '#1F1F1F' }}>
                                  {lang.name}
                                </span>
                                <span style={{ fontSize: '11px', color: '#747775' }}>
                                  {lang.nativeName}
                                </span>
                              </div>
                            </div>
                            {isSelected && <IconCheck size={14} color="#1F1F1F" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.cardFooterAction} className="profile-card-footer">
              <div>
                {languageSavedSuccess && (
                  <span style={styles.profileSuccessToast} className="profile-success-toast">
                    <IconCheck size={14} color="#146C2E" />
                    <span>{t('language_saved', selectedLanguage)}</span>
                  </span>
                )}
              </div>
              <button
                style={{
                  ...styles.profileSaveBtn,
                  opacity: savingLanguage ? 0.7 : 1,
                  cursor: savingLanguage ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSaveLanguage}
                disabled={savingLanguage}
              >
                {savingLanguage ? t('saving', selectedLanguage) : t('save_language', selectedLanguage)}
              </button>
            </div>
          </div>

          {/* Card 4: Syscall Address Identity */}
          <div style={styles.profileCard} className="profile-card">
            <label style={styles.cardHeaderLabel}>{t('syscall_address', savedLang)}</label>
            <div style={styles.addressDisplayBox} className="profile-address-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }} className="profile-address-content">
                <span style={styles.addressMonoText} className="profile-address-text">{currentUser.emailAddress}</span>
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
                {isCopiedAddress ? t('copied', savedLang) : t('copy_address', savedLang)}
              </button>
            </div>
            <span style={styles.profileFieldHint}>
              Official Indian Syscall format tied to your mobile number +91 {currentUser.phone}.
            </span>
          </div>

          {/* Card 5: Mobile Carrier Number */}
          <div style={styles.profileCard} className="profile-card">
            <span style={styles.cardHeaderLabel}>{t('carrier_number', savedLang)}</span>

            <div style={styles.carrierInfoRow} className="profile-carrier-info">
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

          {/* Card 6: Account Actions */}
          <div style={styles.profileActionsRow}>
            <button
              style={styles.profileSignOutBtn}
              onClick={onSignOut}
            >
              {t('sign_out', savedLang)}
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
    backgroundColor: '#F8FAFD',
    borderRadius: '20px',
    margin: '0 16px 16px 0',
    overflowY: 'auto',
    border: 'none',
    boxShadow: 'none',
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
    marginBottom: '8px',
  },
  profileBackBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '20px',
    backgroundColor: '#FFFFFF',
    color: '#0B57D0',
    fontWeight: 600,
    fontSize: '13.5px',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 1px 3px rgba(60,64,67,0.08)',
    transition: 'all 0.15s ease',
  },
  profileContentCard: {
    maxWidth: '680px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  profileHeroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 0 4px',
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
    boxShadow: '0 6px 20px rgba(11, 87, 208, 0.25)',
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
    gap: '16px',
  },
  profileCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: '#FFFFFF',
    borderRadius: '18px',
    padding: '22px',
    border: 'none',
    boxShadow: '0 1px 3px rgba(60,64,67,0.06), 0 4px 14px rgba(60,64,67,0.03)',
  },
  cardTitleBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardHeaderLabel: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#444746',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  previewIndicatorBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    backgroundColor: '#E2E7EF',
    color: '#444746',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  cardDescription: {
    fontSize: '12.5px',
    color: '#747775',
    margin: '2px 0 0 0',
    lineHeight: '1.4',
  },
  subSectionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  subSectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1F1F1F',
    display: 'block',
  },
  innerCardDivider: {
    height: '1px',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    margin: '8px 0',
  },
  dobHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  ageBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '12px',
    backgroundColor: '#E6F4EA',
    color: '#137333',
    fontSize: '11.5px',
    fontWeight: 600,
  },
  profileDobBar: {
    position: 'relative',
  },
  dobCalendarIconBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: '#E2E7EF',
    flexShrink: 0,
  },
  dobBarLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    color: '#444746',
  },
  dobClearBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    border: 'none',
    color: '#444746',
    fontSize: '11.5px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(60,64,67,0.1)',
    transition: 'all 0.15s ease',
  },
  compactDropdownBtn: {
    width: '100%',
    height: '42px',
    padding: '0 14px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: '#F0F4F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'var(--font-body)',
  },
  compactDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    width: '100%',
    minWidth: '220px',
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.12)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    zIndex: 300,
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  compactLangBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 6px',
    borderRadius: '6px',
    backgroundColor: '#E2E7EF',
    color: '#1F1F1F',
    fontWeight: 700,
    fontSize: '11px',
    flexShrink: 0,
  },
  compactLangText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1F1F1F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  compactLangMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    width: '280px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.14)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    zIndex: 300,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  langSearchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
    backgroundColor: '#FFFFFF',
  },
  langSearchInputField: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    color: '#1F1F1F',
    backgroundColor: 'transparent',
  },
  langSearchClearBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  langOptionsList: {
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  langEmptyState: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '12.5px',
    color: '#747775',
  },
  cardFooterAction: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
    marginTop: '4px',
  },
  profileInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  profileTextInput: {
    flex: 1,
    height: '42px',
    padding: '0 16px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: '#F0F4F9',
    fontSize: '14px',
    color: '#1F1F1F',
    fontWeight: 500,
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  profileSaveBtn: {
    height: '40px',
    padding: '0 18px',
    borderRadius: '12px',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(11, 87, 208, 0.25)',
    transition: 'all 0.15s ease',
  },
  profileSuccessToast: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12.5px',
    color: '#146C2E',
    fontWeight: 600,
  },
  profileError: {
    margin: '12px 0',
    padding: '10px 14px',
    color: '#A12622',
    background: '#FFF1F0',
    borderRadius: '12px',
    fontSize: '13px',
  },
  addressDisplayBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backgroundColor: '#F0F4F9',
    padding: '12px 16px',
    borderRadius: '14px',
    border: 'none',
  },
  addressMonoText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14.5px',
    fontWeight: 600,
    color: '#0B57D0',
  },
  copyAddressBtn: {
    padding: '7px 14px',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    border: 'none',
    color: '#1F1F1F',
    fontWeight: 600,
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(60,64,67,0.1)',
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
    backgroundColor: '#E8F0FE',
    border: 'none',
    padding: '4px 12px 4px 6px',
    borderRadius: '20px',
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
    paddingTop: '6px',
    borderTop: 'none',
  },
  profileSignOutBtn: {
    padding: '10px 22px',
    borderRadius: '12px',
    backgroundColor: '#FCE8E6',
    color: '#C5221F',
    fontWeight: 600,
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
};
