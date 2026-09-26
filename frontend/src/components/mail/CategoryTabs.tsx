import React from 'react';
import { IconInbox, IconPromotions, IconSocial, IconUpdates } from '../Icons';
import { useMail } from '../../context/MailContext';
import { t } from '../../utils/i18n';

export type TabCategory = 'all' | 'promotions' | 'social' | 'updates';

interface CategoryTabsProps {
  activeTab: TabCategory;
  onSelectTab: (tab: TabCategory) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ activeTab, onSelectTab }) => {
  const { currentUser } = useMail();
  const lang = currentUser?.language || 'en';

  return (
    <div className="gmail-cat-tabs-row no-scrollbar">
      <button
        className={`gmail-cat-chip ${activeTab === 'all' ? 'active' : ''}`}
        onClick={() => onSelectTab('all')}
      >
        <IconInbox size={15} />
        <span>{t('primary', lang)}</span>
      </button>

      <button
        className={`gmail-cat-chip ${activeTab === 'promotions' ? 'active' : ''}`}
        onClick={() => onSelectTab('promotions')}
      >
        <IconPromotions size={15} />
        <span>{t('promotions', lang)}</span>
      </button>

      <button
        className={`gmail-cat-chip ${activeTab === 'social' ? 'active' : ''}`}
        onClick={() => onSelectTab('social')}
      >
        <IconSocial size={15} />
        <span>{t('social', lang)}</span>
      </button>

      <button
        className={`gmail-cat-chip ${activeTab === 'updates' ? 'active' : ''}`}
        onClick={() => onSelectTab('updates')}
      >
        <IconUpdates size={15} />
        <span>{t('updates', lang)}</span>
      </button>
    </div>
  );
};
