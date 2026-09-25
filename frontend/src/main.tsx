import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// ==========================================================================
// Global Custom Tooltip Manager
// Provides grey text, sans style font, lesser dark background with curved corners
// ==========================================================================
if (typeof document !== 'undefined') {
  let tooltipEl: HTMLDivElement | null = null;
  let activeTarget: HTMLElement | null = null;

  const getTooltipEl = () => {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'syscall-custom-tooltip';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  };

  const hideTooltip = () => {
    if (tooltipEl) {
      tooltipEl.classList.remove('visible');
    }
    if (activeTarget && activeTarget.hasAttribute('data-saved-title')) {
      activeTarget.setAttribute('title', activeTarget.getAttribute('data-saved-title') || '');
      activeTarget.removeAttribute('data-saved-title');
    }
    activeTarget = null;
  };

  document.addEventListener(
    'mouseover',
    (e) => {
      const target = (e.target as HTMLElement)?.closest('[title], [data-tooltip]') as HTMLElement | null;
      if (!target) return;

      if (target === activeTarget) return;
      activeTarget = target;

      const text = target.getAttribute('data-tooltip') || target.getAttribute('title') || '';
      if (!text.trim()) return;

      if (target.hasAttribute('title')) {
        target.setAttribute('data-saved-title', target.getAttribute('title') || '');
        target.removeAttribute('title'); // Prevent browser native yellow/white tooltip
      }

      const tip = getTooltipEl();
      tip.textContent = text;
      tip.classList.add('visible');

      const rect = target.getBoundingClientRect();
      const tipWidth = tip.offsetWidth;
      const tipHeight = tip.offsetHeight;

      // Center horizontally relative to target
      let left = rect.left + rect.width / 2 - tipWidth / 2;
      if (left < 8) left = 8;
      if (left + tipWidth > window.innerWidth - 8) left = window.innerWidth - tipWidth - 8;

      // Position above or below
      let top = rect.bottom + 6;
      if (top + tipHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - tipHeight - 6);
      }

      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    },
    true
  );

  document.addEventListener(
    'mouseout',
    (e) => {
      const target = (e.target as HTMLElement)?.closest('[data-saved-title], [data-tooltip]');
      if (target && target === activeTarget) {
        hideTooltip();
      }
    },
    true
  );

  document.addEventListener('mousedown', hideTooltip, true);
  window.addEventListener('scroll', hideTooltip, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
