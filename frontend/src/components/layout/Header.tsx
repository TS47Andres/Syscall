import React, { useState, useEffect } from 'react';
import { SyscallLogo } from '../Logo';
import {
  IconMenu,
  IconSearch,
  IconClose,
  IconSarvamAI,
} from '../Icons';
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
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  searchQuery,
  onSearchChange,
  onToggleDrawer,
  onToggleSidebarCollapse,
  onProfileClick,
  isProfilePageOpen,
}) => {
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

  return (
    <header style={styles.header}>
      {/* Left: Brand Identity + Hamburger */}
      <div style={styles.leftBrand}>
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

      {/* Center: Search Field */}
      <div style={styles.searchBar}>
        <button
          style={styles.mobileHamburger}
          className="mobile-only"
          onClick={onToggleDrawer}
          title="Open menu"
        >
          <IconMenu size={20} color="#444746" />
        </button>

        <span style={styles.searchGlassIcon}>
          <IconSearch size={18} color="#444746" />
        </span>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search in mail"
          style={styles.searchInput}
        />

        {searchQuery && (
          <button style={styles.clearSearchBtn} onClick={() => onSearchChange('')} title="Clear search">
            <IconClose size={15} color="#5E5E5E" />
          </button>
        )}
      </div>

      {/* Right: Current Time + Sarvam AI Logo + Profile Avatar */}
      <div style={styles.rightArea}>
        {/* Current Time Display (Day, date and time hh:mm 24-hour format, No bg) */}
        <div style={styles.headerTimeText} title="Current Time (24-hour format)">
          {headerTime}
        </div>

        {/* Sarvam AI Logo / Launcher (Pure zoom on hover, transparent bg, no blue hue/border) */}
        <button
          style={styles.sarvamAiBtn}
          className="sarvam-ai-btn"
          title="Sarvam AI Agent (Coming soon)"
          aria-label="Sarvam AI Agent"
        >
          <IconSarvamAI size={22} />
        </button>

        {/* Profile Avatar Button */}
        <div
          style={styles.avatarBtn}
          onClick={onProfileClick}
          title={isProfilePageOpen ? 'Back to Mailbox' : `Account Profile: ${currentUser.name || currentUser.emailAddress}`}
        >
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="Profile" style={styles.avatarImg} />
          ) : (
            getInitials(currentUser.name)
          )}
        </div>
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
  sarvamAiBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
    outline: 'none',
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
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },
};
