import React, { useState } from 'react';
import { IconPlay, IconPause, IconMic } from '../Icons';

interface VoicemailPlayerProps {
  senderAddress: string;
}

export const VoicemailPlayer: React.FC<VoicemailPlayerProps> = ({ senderAddress }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconMic size={18} color="#0B57D0" />
          <strong style={{ fontSize: 13.5, color: '#041E49' }}>
            Cellular Voicemail Audio Recording
          </strong>
        </div>
        <button
          style={styles.playBtn}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <>
              <IconPause size={13} color="#FFFFFF" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <IconPlay size={13} color="#FFFFFF" />
              <span>Play</span>
            </>
          )}
        </button>
      </div>

      <div style={styles.waveformContainer}>
        <div style={{ ...styles.waveformFilled, width: isPlaying ? '75%' : '45%' }} />
      </div>
      <span style={{ fontSize: 11.5, color: '#444746' }}>
        Recorded message from {senderAddress} • 0:28
      </span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '14px',
    borderRadius: '12px',
    backgroundColor: '#EAF1FB',
    border: '1px solid #D3E3FD',
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '16px',
    backgroundColor: '#0B57D0',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '12.5px',
    cursor: 'pointer',
    border: 'none',
  },
  waveformContainer: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#C2E7FF',
    overflow: 'hidden',
  },
  waveformFilled: {
    height: '100%',
    backgroundColor: '#0B57D0',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
};
