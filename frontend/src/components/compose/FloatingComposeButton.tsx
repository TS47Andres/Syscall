import React, { useRef, useState } from 'react';
import { IconCompose } from '../Icons';

interface FloatingComposeButtonProps {
  onOpenCompose: () => void;
}

export const FloatingComposeButton: React.FC<FloatingComposeButtonProps> = ({
  onOpenCompose,
}) => {
  const [fabPos, setFabPos] = useState<{ x?: number; y?: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(16, window.innerWidth - 180),
        y: Math.max(16, window.innerHeight - 90),
      };
    }
    return {};
  });

  const [isDraggingFab, setIsDraggingFab] = useState<boolean>(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    moved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  });

  const handleFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const fabRect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: fabRect.left,
      initialY: fabRect.top,
      moved: false,
    };
    setIsDraggingFab(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingFab) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragStartRef.current.moved = true;
    }
    const newX = Math.max(16, Math.min(window.innerWidth - 160, dragStartRef.current.initialX + deltaX));
    const newY = Math.max(16, Math.min(window.innerHeight - 70, dragStartRef.current.initialY + deltaY));
    setFabPos({ x: newX, y: newY });
  };

  const handleFabPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingFab) return;
    setIsDraggingFab(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (!dragStartRef.current.moved) {
      onOpenCompose();
    }
  };

  return (
    <button
      className={`gmail-fab ${isDraggingFab ? 'dragging' : ''}`}
      style={
        fabPos.x !== undefined && fabPos.y !== undefined
          ? {
              left: `${fabPos.x}px`,
              top: `${fabPos.y}px`,
              right: 'auto',
              bottom: 'auto',
              position: 'fixed',
            }
          : {
              position: 'fixed',
              bottom: '24px',
              right: '24px',
            }
      }
      onPointerDown={handleFabPointerDown}
      onPointerMove={handleFabPointerMove}
      onPointerUp={handleFabPointerUp}
      title="Compose (Click to open, or drag to move anywhere)"
    >
      <IconCompose size={20} color="#001D35" />
      <span>Compose</span>
    </button>
  );
};
