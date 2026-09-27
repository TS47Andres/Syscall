import React from 'react';
import { IconCompose, IconSarvamAI } from '../Icons';
import { useMail } from '../../context/MailContext';
import { t } from '../../utils/i18n';

interface FloatingComposeButtonProps {
  onOpenCompose: () => void;
}

export const FloatingComposeButton: React.FC<FloatingComposeButtonProps> = ({
  onOpenCompose,
}) => {
  const { currentUser } = useMail();
  const lang = currentUser?.language || 'en';
  const composeText = t('compose', lang);

  return (
    <div className="floating-actions-container">
      {/* Sarvam AI Logo / Launcher (same as laptop device) */}
      <button
        type="button"
        className="sarvam-ai-fab"
        title="Sarvam AI Agent (Coming soon)"
        aria-label="Sarvam AI Agent"
      >
        <IconSarvamAI size={28} />
      </button>

      <button
        className="gmail-fab"
        onClick={onOpenCompose}
        title={composeText}
        type="button"
      >
        <IconCompose size={20} color="#001D35" />
        <span>{composeText}</span>
      </button>
    </div>
  );
};
