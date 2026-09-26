/**
 * File: SearchFilterChips.tsx
 * Role: Quick 1-click filter toggles and active search tags for the email list view.
 * Service: Frontend.
 */
import React from 'react';
import type { EmailSearchFilters } from '../../types';
import { IconClose } from '../Icons';
import { useMail } from '../../context/MailContext';
import { t } from '../../utils/i18n';

interface SearchFilterChipsProps {
  filters: EmailSearchFilters;
  onUpdateFilters: (updater: (prev: EmailSearchFilters) => EmailSearchFilters) => void;
  onResetFilters: () => void;
}

export const SearchFilterChips: React.FC<SearchFilterChipsProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
}) => {
  const hasCustomFilters = Boolean(
    filters.from ||
    filters.to ||
    filters.subject ||
    filters.hasWords ||
    (filters.dateRange && filters.dateRange !== 'all') ||
    (filters.folderScope && filters.folderScope !== 'current')
  );

  const hasAnyActiveFilter = Boolean(
    filters.hasAttachment ||
    filters.isStarred ||
    filters.isUnread ||
    hasCustomFilters ||
    filters.query
  );

  const toggleAttachment = () => {
    onUpdateFilters((prev) => ({ ...prev, hasAttachment: !prev.hasAttachment }));
  };

  const toggleStarred = () => {
    onUpdateFilters((prev) => ({ ...prev, isStarred: !prev.isStarred }));
  };

  const toggleUnread = () => {
    onUpdateFilters((prev) => ({ ...prev, isUnread: !prev.isUnread }));
  };

  const toggleWeek = () => {
    onUpdateFilters((prev) => ({
      ...prev,
      dateRange: prev.dateRange === '7d' ? 'all' : '7d',
    }));
  };

  const { currentUser } = useMail();
  const lang = currentUser?.language || 'en';

  return (
    <div style={styles.container} className="search-filter-chips no-scrollbar">
      {/* Quick Toggle Chips */}
      <button
        type="button"
        onClick={toggleAttachment}
        style={{
          ...styles.chip,
          ...(filters.hasAttachment ? styles.chipActive : {}),
        }}
      >
        <span>{t('filter_has_attachment', lang)}</span>
      </button>

      <button
        type="button"
        onClick={toggleUnread}
        style={{
          ...styles.chip,
          ...(filters.isUnread ? styles.chipActive : {}),
        }}
      >
        <span>{t('filter_unread', lang)}</span>
      </button>

      <button
        type="button"
        onClick={toggleStarred}
        style={{
          ...styles.chip,
          ...(filters.isStarred ? styles.chipActive : {}),
        }}
      >
        <span>{t('filter_starred', lang)}</span>
      </button>

      <button
        type="button"
        onClick={toggleWeek}
        style={{
          ...styles.chip,
          ...(filters.dateRange === '7d' ? styles.chipActive : {}),
        }}
      >
        <span>{t('date_7d', lang)}</span>
      </button>

      {/* Active Custom Filter Badges */}
      {filters.from && (
        <span style={styles.activeTag}>
          <span>From: {filters.from}</span>
          <button
            type="button"
            onClick={() => onUpdateFilters((prev) => ({ ...prev, from: '' }))}
            style={styles.tagCloseBtn}
            title="Remove from filter"
          >
            <IconClose size={12} color="#0B57D0" />
          </button>
        </span>
      )}

      {filters.to && (
        <span style={styles.activeTag}>
          <span>To: {filters.to}</span>
          <button
            type="button"
            onClick={() => onUpdateFilters((prev) => ({ ...prev, to: '' }))}
            style={styles.tagCloseBtn}
            title="Remove to filter"
          >
            <IconClose size={12} color="#0B57D0" />
          </button>
        </span>
      )}

      {filters.subject && (
        <span style={styles.activeTag}>
          <span>Subject: {filters.subject}</span>
          <button
            type="button"
            onClick={() => onUpdateFilters((prev) => ({ ...prev, subject: '' }))}
            style={styles.tagCloseBtn}
            title="Remove subject filter"
          >
            <IconClose size={12} color="#0B57D0" />
          </button>
        </span>
      )}

      {filters.hasWords && (
        <span style={styles.activeTag}>
          <span>Words: {filters.hasWords}</span>
          <button
            type="button"
            onClick={() => onUpdateFilters((prev) => ({ ...prev, hasWords: '' }))}
            style={styles.tagCloseBtn}
            title="Remove words filter"
          >
            <IconClose size={12} color="#0B57D0" />
          </button>
        </span>
      )}

      {filters.folderScope && filters.folderScope !== 'current' && (
        <span style={styles.activeTag}>
          <span>Scope: {filters.folderScope}</span>
          <button
            type="button"
            onClick={() => onUpdateFilters((prev) => ({ ...prev, folderScope: 'current' }))}
            style={styles.tagCloseBtn}
            title="Reset folder scope"
          >
            <IconClose size={12} color="#0B57D0" />
          </button>
        </span>
      )}

      {/* Clear All Link when filters active */}
      {hasAnyActiveFilter && (
        <button
          type="button"
          onClick={onResetFilters}
          style={styles.clearAllBtn}
          title={t('filter_reset', lang)}
        >
          {t('filter_reset', lang)}
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#FAFBFD',
    borderBottom: '1px solid #E8EAED',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '16px',
    border: '1px solid #DADCE0',
    backgroundColor: '#FFFFFF',
    color: '#3C4043',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
  },
  chipActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#7BACF0',
    color: '#0B57D0',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(11, 87, 208, 0.15)',
  },
  activeTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '16px',
    backgroundColor: '#D3E3FD',
    color: '#041E49',
    fontSize: '12px',
    fontWeight: 600,
  },
  tagCloseBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllBtn: {
    background: 'none',
    border: 'none',
    color: '#0B57D0',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px',
    textDecoration: 'underline',
    marginLeft: 'auto',
  },
};
