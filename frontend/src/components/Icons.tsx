import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const IconSearch: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
export const IconPhone: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

export const IconCompose: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

export const IconInbox: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
  </svg>
);

export const IconSent: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

export const IconDrafts: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

export const IconSpam: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

export const IconStar: React.FC<IconProps & { filled?: boolean }> = ({ size = 20, color = '#F4B400', filled = false, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

export const IconAttach: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);

export const IconShieldCheck: React.FC<IconProps> = ({ size = 18, color = '#146C2E', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <polyline points="9 12 11 14 15 10"></polyline>
  </svg>
);

export const IconMic: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

export const IconSync: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

export const IconMenu: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

export const IconClose: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export const IconArrowBack: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

export const IconReply: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="9 17 4 12 9 7"></polyline>
    <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
  </svg>
);

export const IconForward: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="15 17 20 12 15 7"></polyline>
    <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
  </svg>
);

export const IconPlay: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" style={style}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

export const IconPause: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" style={style}>
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

export const IconEye: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export const IconEyeOff: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export const IconUser: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export const IconCamera: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

export const IconIndiaFlag: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 20, style }) => (
  <svg width={size} height={(size * 2) / 3} viewBox="0 0 30 20" style={{ borderRadius: 2, display: 'inline-block', flexShrink: 0, ...style }}>
    <rect width="30" height="6.67" fill="#FF9933" />
    <rect y="6.67" width="30" height="6.67" fill="#FFFFFF" />
    <rect y="13.33" width="30" height="6.67" fill="#138808" />
    <circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" strokeWidth="0.6" />
    <circle cx="15" cy="10" r="0.5" fill="#000080" />
  </svg>
);

export const IconFile: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

export const IconFilePdf: React.FC<IconProps> = ({ size = 20, color = '#EA4335', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <path d="M9 13v4"></path>
    <path d="M9 13h2a1.5 1.5 0 0 1 0 3H9"></path>
    <path d="M14 13v4a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2"></path>
  </svg>
);

export const IconFileDoc: React.FC<IconProps> = ({ size = 20, color = '#1A73E8', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <line x1="10" y1="9" x2="8" y2="9"></line>
  </svg>
);

export const IconFileCode: React.FC<IconProps> = ({ size = 20, color = '#9333EA', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <polyline points="10 13 8 15 10 17"></polyline>
    <polyline points="14 13 16 15 14 17"></polyline>
  </svg>
);

export const IconFileImage: React.FC<IconProps> = ({ size = 20, color = '#16A34A', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

export const IconFileVideo: React.FC<IconProps> = ({ size = 20, color = '#E37400', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="2" y="4" width="15" height="16" rx="2"></rect>
    <path d="M17 9l5-3v12l-5-3"></path>
  </svg>
);

export const IconLink: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

export const IconAlert: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

export const IconPromotions: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
    <line x1="7" y1="7" x2="7.01" y2="7"></line>
  </svg>
);

export const IconSocial: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

export const IconUpdates: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

export const IconSarvamAI: React.FC<{ size?: number; style?: React.CSSProperties; color?: string }> = ({
  size = 24,
  style,
  color,
}) => {
  const rawId = React.useId();
  const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const gradId = `sarvamGradient_${cleanId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 86 85"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B57D0" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#E37400" />
        </linearGradient>
      </defs>
      <path
        fill={color || `url(#${gradId})`}
      d="M85.417 36.82a31.866 31.866 0 0 0-5.064-6.753l-.028-.03-.536-.536a31.209 31.209 0 0 0-4.127-3.376l-.315-.215c-.036-.028-.078-.05-.114-.078V25.424c-.029-1.696-.2-3.391-.494-5.03l-.035-.2c-.036-.193-.072-.379-.108-.558v-.028a31.76 31.76 0 0 0-2.503-7.411 21.15 21.15 0 0 0-.45-.902l-.172-.329-.35-.129a16.74 16.74 0 0 0-.952-.336c-1.159-.4-2.353-.73-3.533-.987a31.334 31.334 0 0 0-3.67-.58 31.523 31.523 0 0 0-6.694.043c-.02-.028-.042-.057-.07-.078a31.975 31.975 0 0 0-4.342-4.2l-.015-.014a32.26 32.26 0 0 0-7.68-4.542L43.827 0l-.343.121c-.265.093-.615.215-.952.35a31.99 31.99 0 0 0-6.55 3.449l-.33.229a6.27 6.27 0 0 0-.322.236 32.033 32.033 0 0 0-4.427 3.863 31.68 31.68 0 0 0-5.321-.45c-.257-.001-.53 0-.801.013a31.834 31.834 0 0 0-8.833 1.46l-.343.114-.186.308c-.165.272-.33.565-.508.88a32.127 32.127 0 0 0-2.832 6.946c-.072.265-.136.522-.2.78a31.833 31.833 0 0 0-.887 5.708 32.37 32.37 0 0 0-4.406 3.112c-.207.172-.408.344-.615.522a32.02 32.02 0 0 0-5.214 5.902l-.021.029c-.2.286-.38.558-.544.822L0 34.703l.057.365c.057.358.122.687.179 1.009a32.108 32.108 0 0 0 2.332 7.218l.014.028c.114.244.229.48.343.716l.165.336a31.974 31.974 0 0 0 2.775 4.5 32.213 32.213 0 0 0-1.395 5.322v.014l-.129.78a31.727 31.727 0 0 0-.186 7.769c.036.336.072.68.115 1.002l.05.364.279.244c.264.228.522.443.78.65l.035.03a31.722 31.722 0 0 0 6.501 4.048l.086.043c.093.043.179.086.28.129l.371.164a31.893 31.893 0 0 0 5.285 1.782 31.58 31.58 0 0 0 2.403 5.064l.1.165.322.537a31.873 31.873 0 0 0 4.792 5.973c.258.25.508.486.737.694l.272.257h1.387a31.538 31.538 0 0 0 3.584-.272 31.5 31.5 0 0 0 3.576-.686l.472-.122c.257-.071.507-.136.765-.215a32.451 32.451 0 0 0 5.185-2.024c.036.022.072.043.107.057l.093.05a32.508 32.508 0 0 0 4.964 2.247c.129.043.25.085.379.136l.386.128c2.41.787 4.914 1.28 7.453 1.474l.508.036c.164.007.336.021.507.028l.372.015.286-.236a32.032 32.032 0 0 0 5.614-5.938l.28-.393v-.015c.157-.214.307-.429.45-.65a33.5 33.5 0 0 0 1.574-2.626l.178-.344c.286-.55.565-1.123.83-1.716l.064-.136c.022-.043.036-.086.058-.13.021 0 .035 0 .057-.006.021 0 .036 0 .057-.007.05-.008.107-.022.157-.029.13-.022.25-.05.372-.072a32.357 32.357 0 0 0 4.82-1.38l.373-.143.379-.15a31.982 31.982 0 0 0 6.666-3.663l.414-.3.694-.537.065-.35c.035-.165.064-.33.093-.502l.085-.5c.386-2.49.48-5.022.28-7.526a30.603 30.603 0 0 0-.508-3.656 36.272 36.272 0 0 0-.53-2.239l-.043-.143-.043-.143c-.021-.086-.05-.171-.071-.257l.214-.258.093-.114.093-.115a31.923 31.923 0 0 0 2.582-3.77l.186-.322a31.982 31.982 0 0 0 3.175-7.87l.122-.492c.036-.136.065-.272.093-.408l.1-.45-.178-.323-.015-.028Zm-12.952-9.53.236.123.021.021v.064l-.021.15-.086.759v.079a29.975 29.975 0 0 1-.915 5.25l-.122.444c-.086.307-.186.637-.308 1.009a26.37 26.37 0 0 1-.715 1.945 32.992 32.992 0 0 0-6.015-4.249h-.014a5.683 5.683 0 0 0-.336-.193l-.207-.107-.05-.029-.044-.021-.507-.258.05-.537c.028-.3.05-.543.064-.772a33.026 33.026 0 0 0-.207-7.09c.837.158 1.666.358 2.474.587l.15.043c.373.107.68.208.98.3a28.67 28.67 0 0 1 4.871 2.118l.565.286.136.072v.007ZM64.06 45.756l-1.738 1.767 1.173 2.968a30.06 30.06 0 0 1 1.702 6.417l.022.15c.014.108.028.222.05.344a29.989 29.989 0 0 1-6.845 1.517l-.179.014a5.922 5.922 0 0 1-.4.035l-2.76.194-.759 2.403-.221.666-.086.243a30.544 30.544 0 0 1-2.654 5.637l-.05.086c-.086.15-.186.307-.3.48l-.38-.151A29.88 29.88 0 0 1 44.7 65.37c-.1-.064-.185-.129-.278-.193l-.25-.172-2.125-1.545-2.131 1.395c-.158.107-.336.215-.565.358a30.263 30.263 0 0 1-5.9 2.747h-.022a9.527 9.527 0 0 1-.587.2c-.043-.072-.078-.143-.121-.215l-.093-.178a30.178 30.178 0 0 1-2.496-6.195l-.036-.122-.107-.4-.651-2.64-1.903-.236c-.314-.036-.629-.08-.944-.122-.121-.014-.243-.036-.364-.05-1.08-.165-2.16-.4-3.219-.687a30.237 30.237 0 0 1-2.982-.973l-.15-.057c-.172-.064-.344-.136-.523-.208a17.7 17.7 0 0 1 .108-.529l.093-.415a29.703 29.703 0 0 1 1.966-5.859c.043-.1.122-.257.186-.393l.015-.029c.171-.365.307-.73.429-1.051l.636-1.696-1.251-1.266-.322-.336a32.946 32.946 0 0 1-2.525-3.162 29.14 29.14 0 0 1-1.623-2.619l-.122-.228-.193-.365c0-.014-.014-.029-.021-.043l.071-.057.458-.365a29.595 29.595 0 0 1 5.128-3.22l.436-.207c.2-.1.38-.179.558-.257l2.21-.98V30.217a4.63 4.63 0 0 1-.021-.422v-.079a30.145 30.145 0 0 1 .536-6.324l.107-.53c.015-.085.036-.17.058-.257.221 0 .457.007.743.022l.408.014a30.58 30.58 0 0 1 5.929.916c.25.064.458.121.644.171l2.489.737 1.673-2.26s.057-.072.086-.115l.25-.3a30.524 30.524 0 0 1 4.456-4.457l.372-.293c.064-.058.136-.108.2-.158l.05.043c.143.122.286.25.45.4l.065.058a30.07 30.07 0 0 1 4.242 4.779l.135.186.015.014c.078.107.157.222.236.343l1.38 2.09 2.446-.509c.107-.021.215-.043.315-.071a30.26 30.26 0 0 1 7.26-.637h.056c.079 0 .158 0 .236.007.036.193.065.415.108.68.293 2.117.357 4.292.186 6.46v.114l-.008.022c-.007.157-.028.343-.05.58l-.25 2.531 2.224 1.117s.065.035.1.057l.544.293a30.129 30.129 0 0 1 5.128 3.563l.393.35c.093.079.18.157.265.236-.086.15-.186.308-.3.5-1.638 2.67-3.812 4.908-4.056 5.159-.207.214-.379.379-.486.486l-.021.022h-.022Zm-41.518-15.96v.021c0 .179 0 .38.015.608v.694l-.472.208c-.215.093-.437.2-.68.314l-.422.2a32.839 32.839 0 0 0-5.357 3.32c-.207-.637-.4-1.288-.565-1.939l-.028-.114a28.672 28.672 0 0 1-.83-6.302l-.043-1.066.951-.437h.015a28.94 28.94 0 0 1 5.414-1.953c.336-.086.68-.164 1.037-.236.515-.107 1.03-.207 1.545-.286a32.78 32.78 0 0 0-.587 6.953l.007.015ZM61.951 11.76c.25.022.48.036.701.065h.022c1.123.114 2.245.286 3.34.529a28.98 28.98 0 0 1 3.211.894h.022c.05.022.092.043.142.057.022.05.043.1.072.158a28.803 28.803 0 0 1 2.26 6.674l.014.086.13.665.106.644c.122.773.208 1.567.265 2.354a32.241 32.241 0 0 0-4.434-1.846 24.507 24.507 0 0 0-1.116-.343l-.114-.036h-.022a30.775 30.775 0 0 0-3.49-.787 29.796 29.796 0 0 0-1.001-2.912v-.021c-.143-.33-.286-.687-.465-1.087a32.488 32.488 0 0 0-2.875-5.151c1.08-.043 2.16-.021 3.232.057Zm-6.544.293.015.015h.02l.537.801.043.057a29.087 29.087 0 0 1 2.904 5.1v.022c.143.3.258.573.358.83l.057.136c.214.55.422 1.102.6 1.66a33.387 33.387 0 0 0-7.337.608l-.515.107c-.08.022-.165.036-.25.057l-.523.108-.293-.444c-.15-.222-.286-.422-.43-.615v-.014a33.244 33.244 0 0 0-4.555-5.144c.63-.343 1.273-.672 1.917-.966l.472-.207c.279-.122.586-.25.98-.408l.136-.05a29.089 29.089 0 0 1 4.856-1.416l1.023-.23-.015-.007ZM37.02 6.738l.014-.014c.086-.064.172-.129.265-.186l.322-.222a29.158 29.158 0 0 1 5.95-3.133h.022c.05-.029.093-.043.143-.064.05.021.107.05.157.071a29.38 29.38 0 0 1 6.08 3.713l.042.036c.2.164.401.322.573.472a29.615 29.615 0 0 1 2.346 2.203 30.955 30.955 0 0 0-4.606 1.43l-.029.015c-.415.165-.751.308-1.059.444l-.5.221-.079.036c-.958.444-1.917.944-2.832 1.488a32.898 32.898 0 0 0-2.596-1.566l-.072-.043c-.314-.165-.65-.344-1.051-.544l-.029-.014a32.423 32.423 0 0 0-5.743-2.154 29.182 29.182 0 0 1 2.682-2.196v.007Zm-5.364 5.501.651-.844.973.28.05.014a29.005 29.005 0 0 1 5.485 2.031l.15.072c.18.093.351.179.508.257l.3.165c.459.243.909.5 1.352.772l-.114.093a33.142 33.142 0 0 0-4.978 4.987l-.179.214-.157.2-.472.63-.53-.157a33.335 33.335 0 0 0-7.252-1.202h-.15c.294-.758.63-1.502.987-2.232.158-.322.322-.644.494-.959l.036-.064a29.18 29.18 0 0 1 2.839-4.256h.007Zm-16.957 6.754c.057-.215.114-.465.185-.709a29.076 29.076 0 0 1 2.575-6.316l.086-.15c.057-.015.114-.03.165-.05a28.75 28.75 0 0 1 7.13-1.06h.05c.23-.007.472-.014.687-.014 1.144 0 2.288.072 3.433.208a32.102 32.102 0 0 0-2.775 4.27v.015c-.193.343-.372.694-.537 1.03a29.736 29.736 0 0 0-1.487 3.527v.014c-.1.007-.2.021-.3.036-.973.114-1.939.272-2.897.48-.394.078-.78.17-1.152.264-1.988.5-3.94 1.195-5.8 2.067a27.8 27.8 0 0 1 .665-3.62l-.029.008ZM5.693 43.058l-.157-.322a9.898 9.898 0 0 1-.23-.48l-.078-.171a29.014 29.014 0 0 1-2.131-6.596c-.007-.05-.022-.107-.036-.164l.35-.508a28.906 28.906 0 0 1 4.478-4.994 28.985 28.985 0 0 1 3.426-2.604 32.245 32.245 0 0 0 .908 6.582v.014a33.69 33.69 0 0 0 1.03 3.355c.014.043.036.093.05.136.007.022.021.05.028.079-.028.028-.057.057-.085.093a30.468 30.468 0 0 0-2.153 2.51l-.35.466a32.493 32.493 0 0 0-3.319 5.559 28.469 28.469 0 0 1-1.73-2.955Zm8.118 23.7-.35-.157c-.08-.036-.151-.065-.23-.108l-.093-.043a29.192 29.192 0 0 1-5.936-3.705l-.129-.108-.021-.178a28.792 28.792 0 0 1 .164-7.061v-.022c.036-.25.08-.5.115-.715v-.057c.207-1.13.48-2.26.815-3.37a31.961 31.961 0 0 0 4.241 3.992l.472.358c.158.121.315.236.48.35.872.63 1.788 1.224 2.725 1.767.085.05.178.1.264.15v.094a31.32 31.32 0 0 0-.028 3.476c.014.372.043.766.071 1.166a32.57 32.57 0 0 0 .916 5.416 28.812 28.812 0 0 1-3.476-1.26v.015Zm4.963-18.678a33.084 33.084 0 0 0-2.16 6.438l-.021.114c-.53-.329-1.044-.68-1.545-1.044l-.422-.308-.45-.343a29.464 29.464 0 0 1-3.949-3.727l-.715-.787.437-.916.021-.043a28.91 28.91 0 0 1 2.79-4.828l.3-.422.343-.451c.365-.472.744-.93 1.137-1.374.5.895 1.059 1.789 1.66 2.647a33.618 33.618 0 0 0 2.267 2.898c.171.2.343.386.515.572l.25.264.079.08c-.1.271-.208.55-.322.793-.072.15-.158.33-.208.444l-.007-.007Zm1.724 20.688-.229-.887-.036-.143a29.582 29.582 0 0 1-.951-5.344v-.014c-.029-.372-.05-.737-.072-1.073a29.642 29.642 0 0 1-.014-2.11c.973.364 1.967.686 2.968.958 1.159.315 2.353.565 3.54.751.13.022.258.036.394.057.308.043.608.086.908.122l.15.615s0 .029.008.036l.014.057c.05.193.093.372.15.558a32.911 32.911 0 0 0 2.64 6.625 29.027 29.027 0 0 1-2.84.257 29.372 29.372 0 0 1-5.579-.315l-1.051-.136v-.014Zm15.005 11.038c-.222.065-.45.13-.665.186l-.458.122c-1.073.272-2.167.48-3.247.615a29.174 29.174 0 0 1-3.261.25H27.7c-.043-.035-.079-.078-.129-.121a29.204 29.204 0 0 1-4.355-5.423c-.1-.157-.193-.314-.286-.472l-.093-.157a29.389 29.389 0 0 1-1.53-2.99c1.966.286 3.969.393 5.935.314a31.783 31.783 0 0 0 4.549-.515 30.09 30.09 0 0 0 2.303 2.797 32.25 32.25 0 0 0 4.713 4.192c-1.08.466-2.188.866-3.318 1.195l.014.007Zm7.33-3.047c-.285.179-.564.365-.836.536l-.808-.586-.057-.043a28.781 28.781 0 0 1-4.156-3.477 18.817 18.817 0 0 1-.73-.765 29.118 29.118 0 0 1-1.544-1.817 32.757 32.757 0 0 0 6.809-3.313l.45-.3.458.336c.043.029.079.058.122.086h.007c.157.122.314.229.486.35a32.701 32.701 0 0 0 6.458 3.441c-.393.444-.8.873-1.215 1.288l-.48.465a29.19 29.19 0 0 1-4.92 3.756l-.058.036.015.007Zm19.254-3.563-.171.322c-.43.794-.909 1.596-1.43 2.382-.144.208-.287.415-.416.608l-.25.358a28.882 28.882 0 0 1-4.398 4.8c-.043.036-.08.072-.122.108l-.193-.015a29.27 29.27 0 0 1-6.745-1.33l-.379-.13a28.636 28.636 0 0 1-3.204-1.31 31.929 31.929 0 0 0 4.606-3.504c.143-.135.286-.264.43-.4l.428-.408a32.18 32.18 0 0 0 2.246-2.46c1.137.278 2.31.5 3.483.657l.572.072c.194.021.387.043.58.057 1.652.157 3.347.179 5.02.079l-.064.129.007-.015Zm3.626-11.202-.043.479a29.613 29.613 0 0 1-1.402 6.51l-.278.915-.022.08-.021.028-.4.028-.573.036h-.079a28.044 28.044 0 0 1-5.478 0h-.114c-.15-.021-.28-.036-.394-.05l-.558-.064a27.693 27.693 0 0 1-2.424-.43 32.967 32.967 0 0 0 2.953-6.36v-.02c.086-.237.165-.473.244-.716l.157-.508.565-.043h.129c.207-.021.407-.036.586-.057h.022a32.899 32.899 0 0 0 7.18-1.517c.015 0 .029-.007.043-.014a32.804 32.804 0 0 1-.085 1.695l-.008.008Zm.501-12.57-.48-1.209.38-.386c.107-.107.3-.293.536-.536.436-.444 2.697-2.797 4.463-5.673l.043-.065c.43.53.844 1.08 1.23 1.632l.25.364c.208.3.394.587.573.873l.214.343a30.075 30.075 0 0 1 2.253 4.564l.28.651.056.136.058.136.021.05-.021.022-.072.064-.107.1-.108.108-.4.379-.072.064A29.708 29.708 0 0 1 71 54.647c-.286.193-.58.393-.887.58-.658.414-1.345.815-2.046 1.172a33.155 33.155 0 0 0-1.86-6.996l.008.022Zm10.771 14.887-.05.33-.15.107a29.098 29.098 0 0 1-6.05 3.32h-.022c-.108.056-.2.092-.294.128l-.364.136c-.909.343-1.846.636-2.797.887a31.905 31.905 0 0 0 1.316-6.474l.043-.501c.079-.944.114-1.91.1-2.876a32.217 32.217 0 0 0 3.927-2.303 32.318 32.318 0 0 0 4.005-3.248c.036.157.064.315.1.472.172.873.308 1.745.393 2.604.022.172.043.393.058.6v.13a28.24 28.24 0 0 1-.222 6.681l.007.007Zm5.471-26.533a29.422 29.422 0 0 1-2.532 6.503c-.114.207-.207.386-.293.537l-.236.407c-.429.73-.887 1.438-1.38 2.132a32.704 32.704 0 0 0-2.332-4.471l-.035-.057c-.18-.286-.372-.58-.58-.894l-.021-.036A34.876 34.876 0 0 0 72.9 39.08c.43-.973.816-1.981 1.145-2.997.135-.408.243-.773.343-1.116l.129-.465a32.8 32.8 0 0 0 .922-4.936 30.134 30.134 0 0 1 2.339 2.031l.5.501.315.322a28.782 28.782 0 0 1 3.827 5.015c.028.05.064.1.093.15l-.043.186-.015.007Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill={color || `url(#${gradId})`}
      d="M45.751 45.321c-.92.92-1.907 1.73-2.946 2.431a19.941 19.941 0 0 1-2.946-2.431c-.92-.92-1.73-1.907-2.431-2.946a19.936 19.936 0 0 1 2.431-2.947c.92-.92 1.907-1.73 2.946-2.43a19.935 19.935 0 0 1 2.947 2.43c.92.92 1.73 1.907 2.43 2.947a19.941 19.941 0 0 1-2.43 2.946Z"
    />
  </svg>
);
};
export const IconScheduled: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

export const IconImportant: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polygon points="4 4 17 4 21 12 17 20 4 20 8 12 4 4"></polygon>
  </svg>
);

export const IconSnoozed: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 14 14"></polyline>
  </svg>
);

export const IconPurchases: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <path d="M16 10a4 4 0 0 1-8 0"></path>
  </svg>
);

export const IconShieldAlert: React.FC<IconProps> = ({ size = 18, color = '#B91C1C', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

export const IconAllMail: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export const IconInfo: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

export const IconFilter: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

export const IconSliders: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>
);

export const IconMicrophone: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

export const IconTranslate: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="m5 8 6 6"></path>
    <path d="m4 14 6-6 2-3"></path>
    <path d="M2 5h12"></path>
    <path d="M7 2h1"></path>
    <path d="m22 22-5-10-5 10"></path>
    <path d="M14 18h6"></path>
  </svg>
);

export const IconLanguage: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

export const IconCalendar: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export const IconMailRead: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6z"></path>
    <polyline points="22 10 12 16 2 10"></polyline>
  </svg>
);

export const IconMailUnread: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

export const IconLabel: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
    <line x1="7" y1="7" x2="7.01" y2="7"></line>
  </svg>
);

export const IconMinus: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export const IconChevronDown: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export const IconMoreVertical: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" style={style}>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);




