import React, { useState, useEffect } from 'react';
import { SyscallLogo } from '../Logo';
import {
  IconMenu,
  IconSearch,
  IconClose,
  IconSliders,
} from '../Icons';
import { SearchFilterDropdown } from '../mail/SearchFilterDropdown';
import { useMail } from '../../context/MailContext';
import { t } from '../../utils/i18n';
import type { User } from '../../types';
import { getInitials } from '../../types';

interface HeaderProps {
  currentUser: User;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleDrawer: () => void;
  onToggleSidebarCollapse: () => void;
  onProfileClick: () => void;
  isProfilePageOpen: boolean;
  mobileSelectionToolbar?: React.ReactNode;
  onFilterOpenChange?: (isOpen: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  searchQuery,
  onSearchChange,
  onToggleDrawer,
  onToggleSidebarCollapse,
  onProfileClick,
  isProfilePageOpen,
  mobileSelectionToolbar,
  onFilterOpenChange,
}) => {
  const { searchFilters, setSearchFilters, resetSearchFilters } = useMail();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    onFilterOpenChange?.(isFilterOpen);
  }, [isFilterOpen, onFilterOpenChange]);

  const hasActiveFilters = Boolean(
    searchFilters.from ||
    searchFilters.to ||
    searchFilters.subject ||
    searchFilters.hasWords ||
    searchFilters.hasAttachment ||
    searchFilters.isStarred ||
    searchFilters.isUnread ||
    (searchFilters.dateRange && searchFilters.dateRange !== 'all') ||
    (searchFilters.folderScope && searchFilters.folderScope !== 'current')
  );

  // Current Header Time (Day, Date, Time hh:mm in 24-hour format, no bg)
  const [headerTime, setHeaderTime] = useState<string>(() => {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${day}, ${date} ${month} ${hh}:${mm}`;
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = days[now.getDay()];
      const date = now.getDate();
      const month = months[now.getMonth()];
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setHeaderTime(`${day}, ${date} ${month} ${hh}:${mm}`);
    };
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect mobile viewport (<= 768px)
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header style={styles.header} className={`gmail-top-header ${isFilterOpen ? 'filter-open' : ''}`}>
      {/* Left: Brand Identity + Hamburger (Desktop only) */}
      <div style={styles.leftBrand} className="desktop-only">
        <button
          style={styles.hamburgerBtn}
          onClick={onToggleSidebarCollapse}
          className="desktop-only"
          title="Toggle Main Menu"
        >
          <IconMenu size={20} color="#444746" />
        </button>

        <div style={styles.brandTitleWrap}>
          <SyscallLogo size={32} />
          <span style={styles.brandTitleText}>Syscall</span>
        </div>
      </div>

      {/* Center: Search Field, replaced by selected-message actions on mobile. */}
      {isMobile && mobileSelectionToolbar ? (
        <div className="gmail-mobile-selection-bar" aria-label="Selected message actions">
          {mobileSelectionToolbar}
        </div>
      ) : <div
        style={{
          ...styles.searchBar,
          ...(isFilterOpen ? styles.searchBarExpanded : {}),
        }}
        className={`gmail-search-pill ${isFilterOpen ? 'is-filter-open' : ''}`}
      >
        <button
          style={styles.mobileHamburger}
          className="mobile-only"
          onClick={onToggleDrawer}
          title="Open menu"
          aria-label="Open menu"
        >
          <IconMenu size={20} color="#444746" />
        </button>

        <span style={styles.searchGlassIcon} className="desktop-only">
          <IconSearch size={18} color="#444746" />
        </span>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isMobile ? 'Syscall' : t('search_placeholder', currentUser.language)}
          style={{
            ...styles.searchInput,
            ...(isMobile ? { textAlign: 'center' } : {}),
          }}
          className="gmail-search-input"
        />

        {searchQuery && (
          <button style={styles.clearSearchBtn} onClick={() => onSearchChange('')} title={t('clear_search', currentUser.language)}>
            <IconClose size={15} color="#5E5E5E" />
          </button>
        )}

        <button
          type="button"
          className="gmail-filter-btn"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          style={{
            ...styles.filterToggleBtn,
            backgroundColor: isFilterOpen || hasActiveFilters ? '#E8F0FE' : 'transparent',
            color: hasActiveFilters ? '#0B57D0' : '#444746',
          }}
          title={t('search_options', currentUser.language)}
          aria-label={t('search_options', currentUser.language)}
        >
          <IconSliders size={18} color={hasActiveFilters ? '#0B57D0' : '#444746'} />
          {hasActiveFilters && <span style={styles.activeFilterDot} />}
        </button>

        <SearchFilterDropdown
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={searchFilters}
          onApplyFilters={(newFilters) => setSearchFilters(newFilters)}
          onResetFilters={resetSearchFilters}
          currentLanguage={currentUser.language}
          isMobile={isMobile}
        />
      </div>}

      {/* Right: Current Time + Profile Avatar */}
      <div style={styles.rightArea} className={`gmail-header-right ${isFilterOpen ? 'hide-on-mobile-filter' : ''}`}>
        {/* Current Time Display (Day, date and time hh:mm 24-hour format, No bg) */}
        <div style={styles.headerTimeText} className="desktop-only" title="Current Time (24-hour format)">
          {headerTime}
        </div>

        {/* Profile Avatar Button */}
        <button
          type="button"
          style={styles.avatarBtn}
          className="gmail-header-profile-button"
          onClick={onProfileClick}
          title={isProfilePageOpen ? 'Back to Mailbox' : `Account Profile: ${currentUser.name || currentUser.emailAddress}`}
        >
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="Profile" style={styles.avatarImg} />
          ) : (
            getInitials(currentUser.name)
          )}
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: 'var(--gmail-bg)',
    gap: '16px',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
  },
  leftBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '220px',
  },
  hamburgerBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    border: 'none',
  },
  brandTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  brandTitleText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '22px',
    color: '#1F1F1F',
    letterSpacing: '-0.3px',
  },
  searchBar: {
    flex: 1,
    maxWidth: '720px',
    height: '48px',
    borderRadius: '24px',
    backgroundColor: 'var(--gmail-search-bg)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px 0 16px',
    boxShadow: 'var(--shadow-search)',
    transition: 'background-color 0.2s, box-shadow 0.2s',
    position: 'relative',
    zIndex: 50,
  },
  searchBarExpanded: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px 24px 0 0',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
    zIndex: 600,
  },
  mobileHamburger: {
    background: 'none',
    border: 'none',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '6px',
  },
  searchGlassIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '15px',
    color: '#1F1F1F',
    minWidth: 0,
  },
  clearSearchBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  },
  filterToggleBtn: {
    position: 'relative',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s',
    flexShrink: 0,
    marginLeft: '4px',
  },
  activeFilterDot: {
    position: 'absolute',
    top: '5px',
    right: '5px',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#0B57D0',
  },
  rightArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  headerTimeText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#444746',
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    background: 'none',
    padding: '0 4px',
  },
  avatarBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
    overflow: 'hidden',
    border: 'none',
    outline: 'none',
    padding: 0,
    fontFamily: 'inherit',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },
};
