import React from 'react';
import { IconInbox, IconPromotions, IconSocial, IconUpdates } from '../Icons';

export type TabCategory = 'all' | 'promotions' | 'social' | 'updates';

interface CategoryTabsProps {
  activeTab: TabCategory;
  onSelectTab: (tab: TabCategory) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="gmail-cat-tabs-row no-scrollbar">
      <button
        className={`gmail-cat-chip ${activeTab === 'all' ? 'active' : ''}`}
        onClick={() => onSelectTab('all')}
      >
        <IconInbox size={15} />
        <span>Primary</span>
      </button>

      <button
        className={`gmail-cat-chip ${activeTab === 'promotions' ? 'active' : ''}`}
        onClick={() => onSelectTab('promotions')}
      >
        <IconPromotions size={15} />
        <span>Promotions</span>
      </button>

      <button
        className={`gmail-cat-chip ${activeTab === 'social' ? 'active' : ''}`}
        onClick={() => onSelectTab('social')}
      >
        <IconSocial size={15} />
        <span>Social</span>
      </button>

      <button
        className={`gmail-cat-chip ${activeTab === 'updates' ? 'active' : ''}`}
        onClick={() => onSelectTab('updates')}
      >
        <IconUpdates size={15} />
        <span>Updates</span>
      </button>
    </div>
  );
};
