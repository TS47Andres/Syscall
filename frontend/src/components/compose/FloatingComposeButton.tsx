/**
 * File: FloatingComposeButton.tsx
 * Role: Fixed compose action button. The compose pop-up itself is movable.
 * Service: Frontend.
 */
import React from 'react';
import { IconCompose } from '../Icons';

interface FloatingComposeButtonProps {
  onOpenCompose: () => void;
}

export const FloatingComposeButton: React.FC<FloatingComposeButtonProps> = ({
  onOpenCompose,
}) => {
  return (
    <button
      className="gmail-fab"
      onClick={onOpenCompose}
      title="Compose"
      type="button"
    >
      <IconCompose size={20} color="#001D35" />
      <span>Compose</span>
    </button>
  );
};
