/**
 * File: ModernSchedulePicker.tsx
 * Role: Modern date & time picker for scheduling email delivery using flatpickr (MIT).
 * Service: Frontend.
 */
import React, { useEffect, useRef, useState } from 'react';
import flatpickr from 'flatpickr';
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
import 'flatpickr/dist/flatpickr.min.css';
import 'flatpickr/dist/themes/material_blue.css';
import { IconScheduled, IconClose } from '../Icons';

interface ModernSchedulePickerProps {
  scheduledAt: string;
  onScheduleChange: (iso: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export const ModernSchedulePicker: React.FC<ModernSchedulePickerProps> = ({
  scheduledAt,
  onScheduleChange,
  onClear,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fpRef = useRef<FlatpickrInstance | null>(null);
  const [showPresets, setShowPresets] = useState<boolean>(false);

  useEffect(() => {
    if (!inputRef.current) return;

    // Minimum allowed time is 2 minutes into the future
    const minDateTime = new Date(Date.now() + 2 * 60 * 1000);

    const fp = flatpickr(inputRef.current, {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      altInput: true,
      altFormat: 'M j, Y - h:i K',
      minDate: minDateTime,
      time_24hr: false,
      minuteIncrement: 5,
      defaultDate: scheduledAt ? new Date(scheduledAt) : undefined,
      onChange: (selectedDates) => {
        if (selectedDates && selectedDates.length > 0) {
          onScheduleChange(selectedDates[0].toISOString());
        }
      },
    });

    fpRef.current = fp;

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

  const setPreset = (calcDate: () => Date) => {
    const target = calcDate();
    if (fpRef.current) {
      fpRef.current.setDate(target, true);
    }
    onScheduleChange(target.toISOString());
    setShowPresets(false);
  };

  const getTomorrow9AM = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const getTomorrow2PM = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d;
  };

  const getNextMonday9AM = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div style={styles.labelGroup}>
          <IconScheduled size={16} color="#0B57D0" />
          <span style={styles.labelTitle}>Schedule Delivery</span>
        </div>

        <button
          type="button"
          style={styles.presetsToggleBtn}
          onClick={() => setShowPresets(!showPresets)}
        >
          {showPresets ? 'Hide presets' : 'Quick times'}
        </button>
      </div>

      {showPresets && (
        <div style={styles.presetsContainer}>
          <button
            type="button"
            style={styles.presetChip}
            onClick={() => setPreset(getTomorrow9AM)}
          >
            Tomorrow 9:00 AM
          </button>
          <button
            type="button"
            style={styles.presetChip}
            onClick={() => setPreset(getTomorrow2PM)}
          >
            Tomorrow 2:00 PM
          </button>
          <button
            type="button"
            style={styles.presetChip}
            onClick={() => setPreset(getNextMonday9AM)}
          >
            Monday 9:00 AM
          </button>
        </div>
      )}

      <div style={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Click to pick date & time..."
          disabled={disabled}
          style={styles.hiddenInput}
        />

        {scheduledAt && (
          <button
            type="button"
            style={styles.clearBtn}
            onClick={onClear}
            title="Cancel scheduling"
          >
            <IconClose size={14} color="#5E5E5E" />
            <span>Cancel schedule</span>
          </button>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#F8FAFD',
    borderRadius: '10px',
    border: '1px solid #D3E3FD',
    marginTop: '6px',
    marginBottom: '6px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  labelTitle: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#041E49',
    letterSpacing: '-0.1px',
  },
  presetsToggleBtn: {
    background: 'none',
    border: 'none',
    color: '#0B57D0',
    fontSize: '11.5px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  presetsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    paddingTop: '2px',
  },
  presetChip: {
    fontSize: '11.5px',
    fontWeight: 500,
    backgroundColor: '#FFFFFF',
    color: '#0B57D0',
    border: '1px solid #C2E7FF',
    borderRadius: '14px',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
    width: '100%',
  },
  hiddenInput: {
    width: '100%',
  },
  clearBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: '#FFFFFF',
    border: '1px solid #DADCE0',
    borderRadius: '16px',
    padding: '4px 10px',
    fontSize: '11.5px',
    fontWeight: 500,
    color: '#444746',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
  },
};
