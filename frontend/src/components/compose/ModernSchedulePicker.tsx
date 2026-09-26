/**
 * File: ModernSchedulePicker.tsx
 * Role: Modern date & time picker for scheduling email delivery using flatpickr (MIT).
 * Service: Frontend.
 */
import React, { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
import 'flatpickr/dist/flatpickr.min.css';
import { IconScheduled, IconClose } from '../Icons';

interface ModernSchedulePickerProps {
  scheduledAt: string;
  onScheduleChange: (iso: string) => void;
  onClear: () => void;
  autoOpen?: boolean;
  disabled?: boolean;
}

export const ModernSchedulePicker: React.FC<ModernSchedulePickerProps> = ({
  scheduledAt,
  onScheduleChange,
  onClear,
  autoOpen = false,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fpRef = useRef<FlatpickrInstance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Minimum allowed time is 2 minutes into the future
    const minDateTime = new Date(Date.now() + 2 * 60 * 1000);

    const fp = flatpickr(inputRef.current, {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      altInput: true,
      altFormat: 'D, M j, Y \\a\\t h:i K',
      altInputClass: 'compose-schedule-alt-input',
      minDate: minDateTime,
      time_24hr: false,
      minuteIncrement: 5,
      position: 'auto',
      disableMobile: true,
      defaultDate: scheduledAt ? new Date(scheduledAt) : undefined,
      onChange: (selectedDates) => {
        if (selectedDates && selectedDates.length > 0) {
          onScheduleChange(selectedDates[0].toISOString());
        }
      },
    });

    fpRef.current = fp;

    // Auto-open calendar if requested and no date set yet
    if (autoOpen && !scheduledAt) {
      const openTimer = setTimeout(() => {
        fp.open();
      }, 60);
      return () => {
        clearTimeout(openTimer);
        fp.destroy();
        fpRef.current = null;
      };
    }

    return () => {
      fp.destroy();
      fpRef.current = null;
    };
  }, []);

  // Sync external scheduledAt changes into flatpickr
  useEffect(() => {
    if (fpRef.current) {
      if (scheduledAt) {
        fpRef.current.setDate(new Date(scheduledAt), false);
      } else {
        fpRef.current.clear();
      }
    }
  }, [scheduledAt]);

  const handleBarClick = () => {
    if (!disabled && fpRef.current) {
      fpRef.current.open();
    }
  };

  return (
    <div
      className={`compose-schedule-bar ${scheduledAt ? 'is-scheduled' : ''}`}
      onClick={handleBarClick}
      title="Click to select or modify delivery date & time"
    >
      <div className="compose-schedule-left">
        <div className="compose-schedule-badge">
          <IconScheduled size={16} color="#0B57D0" />
        </div>
        <div className="compose-schedule-meta">
          <span className="compose-schedule-label">
            {scheduledAt ? 'Send scheduled for' : 'Choose delivery date & time'}
          </span>
          <div className="compose-schedule-input-container">
            <input
              ref={inputRef}
              type="text"
              placeholder="Click to choose date and time..."
              disabled={disabled}
              className="compose-schedule-base-input"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="compose-schedule-cancel-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        title="Cancel scheduling"
        disabled={disabled}
      >
        <IconClose size={13} color="#444746" />
        <span>Cancel</span>
      </button>
    </div>
  );
};
