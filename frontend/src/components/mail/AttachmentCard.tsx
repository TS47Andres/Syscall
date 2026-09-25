import React from 'react';
import {
  IconFile,
  IconFilePdf,
  IconFileDoc,
  IconFileCode,
  IconFileImage,
  IconFileVideo,
  IconShieldCheck,
  IconShieldAlert,
} from '../Icons';
import type { Attachment } from '../../types';

interface AttachmentCardProps {
  attachment: Attachment;
}

export const getFileIcon = (filename: string, isInfected?: boolean) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const color = isInfected ? '#DC2626' : undefined;

  if (['pdf'].includes(ext)) {
    return <IconFilePdf size={22} color={color || '#EA4335'} />;
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md'].includes(ext)) {
    return <IconFileDoc size={22} color={color || '#1A73E8'} />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'json', 'pem', 'sh', 'sql', 'yaml', 'yml'].includes(ext)) {
    return <IconFileCode size={22} color={color || '#9333EA'} />;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <IconFileImage size={22} color={color || '#16A34A'} />;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)) {
    return <IconFileVideo size={22} color={color || '#E37400'} />;
  }
  return <IconFile size={22} color={color || '#0B57D0'} />;
};

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment }) => {
  const isInfected = attachment.clamavStatus === 'infected';

  return (
    <div style={styles.card}>
      {/* File Icon with overlaid Green or Red Antivirus Scan Badge */}
      <div
        style={{
          ...styles.iconWrapper,
          backgroundColor: isInfected ? '#FEE2E2' : '#F1F3F4',
        }}
      >
        {getFileIcon(attachment.filename, isInfected)}
        <div
          style={{
            ...styles.scanBadge,
            backgroundColor: isInfected ? '#DC2626' : '#16A34A',
          }}
          title={isInfected ? 'Antivirus scan: Threat detected' : 'Antivirus scan: Clean & verified'}
        >
          {isInfected ? (
            <IconShieldAlert size={10} color="#FFFFFF" />
          ) : (
            <IconShieldCheck size={10} color="#FFFFFF" />
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={styles.filename} title={attachment.filename}>
          {attachment.filename}
        </strong>
        <div style={styles.metaRow}>
          <span style={styles.sizeText}>
            {(attachment.sizeBytes / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #E0E2EC',
    backgroundColor: '#F8F9FA',
    minWidth: 0,
  },
  iconWrapper: {
    position: 'relative',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scanBadge: {
    position: 'absolute',
    bottom: '-3px',
    right: '-3px',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  },
  filename: {
    fontSize: '12.5px',
    color: '#1F1F1F',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '3px',
  },
  sizeText: {
    fontSize: '11px',
    color: '#747775',
  },
};
