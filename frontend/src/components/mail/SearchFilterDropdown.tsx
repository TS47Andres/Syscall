/**
 * File: SearchFilterDropdown.tsx
 * Role: Downward-extending search bar panel for advanced email search options with aesthetic custom checkboxes.
 * Service: Frontend.
 */
import React, { useState, useEffect, useRef } from 'react';
import type { EmailSearchFilters } from '../../types';
import { IconSearch } from '../Icons';
import { t } from '../../utils/i18n';

interface SearchFilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  filters: EmailSearchFilters;
  onApplyFilters: (filters: EmailSearchFilters) => void;
  onResetFilters: () => void;
  currentLanguage?: string;
}

interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

function CustomFilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (val: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [isOpen]);

  const currentOption = options.find((o) => o.value === value) || options[0];

  return (
    <div style={styles.fieldRow}>
      <label style={styles.fieldLabel}>{label}</label>
      <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
        <button
          type="button"
          className="syscall-custom-dropdown-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          <span style={{ fontWeight: 500, color: '#1F1F1F' }}>{currentOption.label}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#444746"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="syscall-custom-dropdown-popover">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  className={`syscall-custom-dropdown-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B57D0" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const SearchFilterDropdown: React.FC<SearchFilterDropdownProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  currentLanguage = 'en',
}) => {
  const [localFilters, setLocalFilters] = useState<EmailSearchFilters>(filters);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  // Close when clicking outside the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (panelRef.current && !panelRef.current.contains(target)) {
        const isToggleBtn =
          target?.closest('button[title*="Search options"]') ||
          target?.closest('button[aria-label*="Search options"]');
        if (!isToggleBtn) {
          onClose();
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  return (
    <div
      ref={panelRef}
      style={styles.dropdownPanel}
      className="search-bar-extended-panel"
    >
      <form onSubmit={handleSubmit} style={styles.formContainer}>
        {/* Search Scope / Folder with Custom Dropdown */}
        <CustomFilterSelect<NonNullable<EmailSearchFilters['folderScope']>>
          label={t('filter_folder', currentLanguage)}
          value={localFilters.folderScope || 'current'}
          options={[
            { value: 'current', label: t('folder_current', currentLanguage) },
            { value: 'all', label: t('folder_all', currentLanguage) },
            { value: 'inbox', label: t('inbox', currentLanguage) },
            { value: 'sent', label: t('sent', currentLanguage) },
            { value: 'drafts', label: t('drafts', currentLanguage) },
            { value: 'trash', label: t('bin', currentLanguage) },
          ]}
          onChange={(val) => setLocalFilters((prev) => ({ ...prev, folderScope: val }))}
        />

        {/* From & To in a 2-column grid with curved borders */}
        <div style={styles.gridTwo}>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>{t('filter_from', currentLanguage)}</label>
            <input
              type="text"
              value={localFilters.from || ''}
              onChange={(e) => setLocalFilters((prev) => ({ ...prev, from: e.target.value }))}
              placeholder="Sender address or phone"
              className="syscall-curved-input"
            />
          </div>

          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>{t('filter_to', currentLanguage)}</label>
            <input
              type="text"
              value={localFilters.to || ''}
              onChange={(e) => setLocalFilters((prev) => ({ ...prev, to: e.target.value }))}
              placeholder="Recipient address or phone"
              className="syscall-curved-input"
            />
          </div>
        </div>

        {/* Subject */}
        <div style={styles.fieldRow}>
          <label style={styles.fieldLabel}>{t('filter_subject', currentLanguage)}</label>
          <input
            type="text"
            value={localFilters.subject || ''}
            onChange={(e) => setLocalFilters((prev) => ({ ...prev, subject: e.target.value }))}
            placeholder="Keywords in subject"
            className="syscall-curved-input"
          />
        </div>

        {/* Has the words */}
        <div style={styles.fieldRow}>
          <label style={styles.fieldLabel}>{t('filter_words', currentLanguage)}</label>
          <input
            type="text"
            value={localFilters.hasWords || ''}
            onChange={(e) => setLocalFilters((prev) => ({ ...prev, hasWords: e.target.value }))}
            placeholder="Words in message body"
            className="syscall-curved-input"
          />
        </div>

        {/* Date Range with Custom Dropdown */}
        <CustomFilterSelect<NonNullable<EmailSearchFilters['dateRange']>>
          label={t('filter_date', currentLanguage)}
          value={localFilters.dateRange || 'all'}
          options={[
            { value: 'all', label: t('date_all', currentLanguage) },
            { value: '1d', label: t('date_1d', currentLanguage) },
            { value: '7d', label: t('date_7d', currentLanguage) },
            { value: '30d', label: t('date_1m', currentLanguage) },
            { value: '90d', label: t('date_6m', currentLanguage) },
            { value: '1y', label: t('date_1y', currentLanguage) },
          ]}
          onChange={(val) => setLocalFilters((prev) => ({ ...prev, dateRange: val }))}
        />

        {/* Aesthetic Animated Checkboxes without any background container */}
        <div style={styles.checkboxesRow}>
          {/* Has Attachment */}
          <label
            className="syscall-aesthetic-checkbox-label"
            onClick={(e) => {
              e.preventDefault();
              setLocalFilters((prev) => ({ ...prev, hasAttachment: !prev.hasAttachment }));
            }}
          >
            <span className={`syscall-custom-checkbox ${localFilters.hasAttachment ? 'is-checked' : ''}`}>
              {localFilters.hasAttachment && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span>{t('filter_has_attachment', currentLanguage)}</span>
          </label>

          {/* Starred */}
          <label
            className="syscall-aesthetic-checkbox-label"
            onClick={(e) => {
              e.preventDefault();
              setLocalFilters((prev) => ({ ...prev, isStarred: !prev.isStarred }));
            }}
          >
            <span className={`syscall-custom-checkbox ${localFilters.isStarred ? 'is-checked' : ''}`}>
              {localFilters.isStarred && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span>{t('filter_starred', currentLanguage)}</span>
          </label>

          {/* Unread */}
          <label
            className="syscall-aesthetic-checkbox-label"
            onClick={(e) => {
              e.preventDefault();
              setLocalFilters((prev) => ({ ...prev, isUnread: !prev.isUnread }));
            }}
          >
            <span className={`syscall-custom-checkbox ${localFilters.isUnread ? 'is-checked' : ''}`}>
              {localFilters.isUnread && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span>{t('filter_unread', currentLanguage)}</span>
          </label>
        </div>

        {/* Action Buttons Footer */}
        <div style={styles.actionsFooter}>
          <button
            type="button"
            onClick={handleReset}
            style={styles.resetBtn}
          >
            {t('filter_reset', currentLanguage)}
          </button>

          <div style={styles.rightButtons}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.applyBtn}
            >
              <IconSearch size={14} color="#FFFFFF" />
              <span>{t('filter_apply', currentLanguage)}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dropdownPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: '0 0 24px 24px',
    boxShadow: '0 14px 32px rgba(0, 0, 0, 0.18)',
    borderTop: '1px solid #E0E2EC',
    zIndex: 600,
    padding: '18px 22px 22px 22px',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '13px',
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  fieldLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#444746',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  checkboxesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '6px 2px',
    flexWrap: 'wrap',
    marginTop: '4px',
    backgroundColor: 'transparent',
    border: 'none',
  },
  actionsFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid #F1F3F4',
    marginTop: '4px',
  },
  resetBtn: {
    padding: '8px 16px',
    borderRadius: '12px',
    border: '1px solid #E0E2EC',
    backgroundColor: '#FFFFFF',
    color: '#444746',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  rightButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#444746',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  applyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 22px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(11, 87, 208, 0.28)',
    transition: 'all 0.15s ease',
  },
};
