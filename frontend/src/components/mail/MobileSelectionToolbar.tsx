import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IconArchive,
  IconClose,
  IconImportant,
  IconMailRead,
  IconMailUnread,
  IconMoreVertical,
  IconSpam,
  IconStar,
  IconTrash,
} from '../Icons';

interface MobileSelectionToolbarProps {
  count: number;
  canArchive: boolean;
  allArchived: boolean;
  allRead: boolean;
  inBin: boolean;
  canReportSpam: boolean;
  onClear: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onMarkRead: (read: boolean) => void;
  onStar: () => void;
  onImportant: () => void;
  onSpam: () => void;
}

export const MobileSelectionToolbar: React.FC<MobileSelectionToolbarProps> = ({
  count,
  canArchive,
  allArchived,
  allRead,
  inBin,
  canReportSpam,
  onClear,
  onArchive,
  onDelete,
  onMarkRead,
  onStar,
  onImportant,
  onSpam,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 12 });
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const openMore = () => {
    if (moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      setMenuPosition({ top: Math.min(rect.bottom + 6, window.innerHeight - 156), right: Math.max(12, window.innerWidth - rect.right) });
    }
    setIsMoreOpen(true);
  };
  const action = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <button type="button" key={label} title={label} aria-label={label} onClick={onClick} style={styles.iconButton}>
      {icon}
    </button>
  );

  return (
    <div style={styles.toolbar}>
      {action('Clear selection', <IconClose size={20} color="#444746" />, onClear)}
      <span style={styles.count} aria-live="polite">{count}</span>
      <div style={styles.actions}>
        {canArchive && action(allArchived ? 'Move to inbox' : 'Archive', <IconArchive size={20} color="#444746" />, onArchive)}
        {action(inBin ? 'Delete forever' : 'Delete', <IconTrash size={20} color="#444746" />, onDelete)}
        {action(allRead ? 'Mark unread' : 'Mark read', allRead
          ? <IconMailUnread size={20} color="#444746" />
          : <IconMailRead size={20} color="#444746" />, () => onMarkRead(!allRead))}
        <div style={styles.moreWrap}>
          <button ref={moreButtonRef} type="button" title="More actions" aria-label="More actions" aria-expanded={isMoreOpen}
            onClick={() => isMoreOpen ? setIsMoreOpen(false) : openMore()} style={styles.iconButton}>
            <IconMoreVertical size={20} color="#444746" />
          </button>
        </div>
      </div>
      {isMoreOpen && createPortal(
        <>
          <button type="button" aria-label="Close actions menu" onClick={() => setIsMoreOpen(false)} style={styles.outsideClick} />
          <div role="menu" style={{ ...styles.menu, top: menuPosition.top, right: menuPosition.right }}>
            <button role="menuitem" type="button" onClick={() => { setIsMoreOpen(false); onStar(); }} style={styles.menuItem}>
              <IconStar size={18} color="#E37400" /> Star
            </button>
            <button role="menuitem" type="button" onClick={() => { setIsMoreOpen(false); onImportant(); }} style={styles.menuItem}>
              <IconImportant size={18} color="#0B57D0" /> Mark as important
            </button>
            {canReportSpam && <button role="menuitem" type="button" onClick={() => { setIsMoreOpen(false); onSpam(); }} style={styles.menuItem}>
              <IconSpam size={18} color="#BA1A1A" /> Report spam
            </button>}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, gap: 4 },
  count: { fontSize: 14, fontWeight: 600, color: '#1F1F1F', minWidth: 18, textAlign: 'center' },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1, minWidth: 0 },
  iconButton: { width: 40, height: 40, flexShrink: 0, border: 0, borderRadius: '50%', background: 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  moreWrap: { position: 'relative', display: 'inline-flex' },
  outsideClick: { position: 'fixed', inset: 0, zIndex: 100, border: 0, background: 'transparent' },
  menu: { position: 'fixed', zIndex: 101, width: 210, padding: '6px 0', background: '#fff', border: '1px solid #E0E2EC', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,.18)' },
  menuItem: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 14px', border: 0, background: '#fff', color: '#1F1F1F', fontSize: 14, textAlign: 'left', cursor: 'pointer' },
};
