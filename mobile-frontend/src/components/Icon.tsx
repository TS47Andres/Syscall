import React from 'react';
import Svg, { Path, Circle, Line, Rect, Polyline } from 'react-native-svg';

export type IconName = 'menu'|'search'|'filter'|'inbox'|'promotions'|'social'|'updates'|'star'|'compose'|'back'|'archive'|'trash'|'more'|'moreVertical'|'reply'|'forward'|'send'|'attach'|'close'|'check'|'refresh'|'mail'|'mailUnread'|'settings'|'profile'|'logout'|'chevron'|'camera'|'spam'|'restore'|'calendar'|'eye'|'eyeOff'|'clock'|'shieldCheck'|'language'|'info'|'sparkles';
export function Icon({ name, size = 20, color = '#444746', filled = false }: { name: IconName; size?: number; color?: string; filled?: boolean }) {
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: filled ? color : 'none' };
  const paths: Record<IconName, React.ReactNode> = {
    menu: <><Line x1="3" y1="12" x2="21" y2="12" {...common}/><Line x1="3" y1="6" x2="21" y2="6" {...common}/><Line x1="3" y1="18" x2="21" y2="18" {...common}/></>,
    search: <><Circle cx="11" cy="11" r="8" {...common}/><Line x1="21" y1="21" x2="16.65" y2="16.65" {...common}/></>,
    filter: <><Line x1="4" y1="21" x2="4" y2="14" {...common}/><Line x1="4" y1="10" x2="4" y2="3" {...common}/><Line x1="12" y1="21" x2="12" y2="12" {...common}/><Line x1="12" y1="8" x2="12" y2="3" {...common}/><Line x1="20" y1="21" x2="20" y2="16" {...common}/><Line x1="20" y1="12" x2="20" y2="3" {...common}/><Line x1="2" y1="14" x2="6" y2="14" {...common}/><Line x1="10" y1="8" x2="14" y2="8" {...common}/><Line x1="18" y1="16" x2="22" y2="16" {...common}/></>,
    inbox: <><Polyline points="22 12 16 12 14 15 10 15 8 12 2 12" {...common}/><Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" {...common}/></>,
    promotions: <><Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" {...common}/><Line x1="7" y1="7" x2="7.01" y2="7" {...common}/></>,
    social: <><Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...common}/><Circle cx="9" cy="7" r="4" {...common}/><Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...common}/></>,
    updates: <><Circle cx="12" cy="12" r="10" {...common}/><Line x1="12" y1="8" x2="12" y2="12" {...common}/><Line x1="12" y1="16" x2="12.01" y2="16" {...common}/></>,
    spam: <><Circle cx="12" cy="12" r="10" {...common}/><Line x1="4.93" y1="4.93" x2="19.07" y2="19.07" {...common}/></>,
    restore: <><Path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" {...common}/><Path d="M3 3v5h5m4-1v5l3 2" {...common}/></>,
    calendar: <><Rect x="3" y="4" width="18" height="18" rx="2" {...common}/><Line x1="16" y1="2" x2="16" y2="6" {...common}/><Line x1="8" y1="2" x2="8" y2="6" {...common}/><Line x1="3" y1="10" x2="21" y2="10" {...common}/></>,
    eye: <><Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" {...common}/><Circle cx="12" cy="12" r="3" {...common}/></>,
    eyeOff: <><Path d="m3 3 18 18" {...common}/><Path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.8 15.8 0 0 1-3.2 4.1M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.4 0 2.6-.3 3.7-.8" {...common}/><Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...common}/></>,
    star: <Path d="M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z" {...common}/>,
    compose: <><Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...common}/><Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...common}/></>,
    back: <><Line x1="19" y1="12" x2="5" y2="12" {...common}/><Polyline points="12 19 5 12 12 5" {...common}/></>,
    archive: <><Rect x="3" y="4" width="18" height="4" rx="1" {...common}/><Path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4" {...common}/></>,
    trash: <><Polyline points="3 6 5 6 21 6" {...common}/><Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...common}/><Line x1="10" y1="11" x2="10" y2="17" {...common}/><Line x1="14" y1="11" x2="14" y2="17" {...common}/></>,
    more: <><Circle cx="5" cy="12" r="1" fill={color}/><Circle cx="12" cy="12" r="1" fill={color}/><Circle cx="19" cy="12" r="1" fill={color}/></>,
    moreVertical: <><Circle cx="12" cy="5" r="1.5" fill={color}/><Circle cx="12" cy="12" r="1.5" fill={color}/><Circle cx="12" cy="19" r="1.5" fill={color}/></>,
    reply: <><Polyline points="9 17 4 12 9 7" {...common}/><Path d="M20 18v-2a4 4 0 0 0-4-4H4" {...common}/></>,
    forward: <><Polyline points="15 17 20 12 15 7" {...common}/><Path d="M4 18v-2a4 4 0 0 1 4-4h12" {...common}/></>,
    send: <><Path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" {...common}/></>,
    attach: <Path d="m21 11.5-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.5 5.8l-9.1 9.1a2 2 0 0 1-2.8-2.8l8.5-8.5" {...common}/>,
    close: <><Path d="m18 6-12 12M6 6l12 12" {...common}/></>,
    check: <Polyline points="5 12 10 17 20 7" {...common}/>,
    refresh: <><Polyline points="23 4 23 10 17 10" {...common} strokeWidth={2.2}/><Polyline points="1 20 1 14 7 14" {...common} strokeWidth={2.2}/><Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" {...common} strokeWidth={2.2}/></>,
    mail: <><Rect x="3" y="5" width="18" height="14" rx="2" {...common}/><Path d="m4 7 8 6 8-6" {...common}/></>,
    mailUnread: <><Rect x="3" y="6" width="18" height="13" rx="2" {...common}/><Path d="m4 8 8 5 8-5" {...common}/><Circle cx="19" cy="5" r="3" fill={color} stroke="#FFFFFF" strokeWidth="1.5"/></>,
    settings: <><Circle cx="12" cy="12" r="3" {...common}/><Path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z" {...common}/></>,
    profile: <><Circle cx="12" cy="8" r="4" {...common}/><Path d="M4 21a8 8 0 0 1 16 0" {...common}/></>,
    logout: <><Path d="M10 17l5-5-5-5m5 5H3" {...common}/><Path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" {...common}/></>,
    chevron: <Polyline points="6 9 12 15 18 9" {...common}/>,
    camera: <><Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" {...common}/><Circle cx="12" cy="13" r="4" {...common}/></>,
    clock: <><Circle cx="12" cy="12" r="9" {...common}/><Path d="M12 7v5l3 2" {...common}/></>,
    shieldCheck: <><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...common} strokeWidth={2.2}/><Polyline points="9 12 11 14 15 10" {...common} strokeWidth={2.2}/></>,
    language: <><Circle cx="12" cy="12" r="10" {...common}/><Line x1="2" y1="12" x2="22" y2="12" {...common}/><Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...common}/></>,
    info: <><Circle cx="12" cy="12" r="10" {...common} strokeWidth={2.2}/><Line x1="12" y1="16" x2="12" y2="12" {...common} strokeWidth={2.2}/><Line x1="12" y1="8" x2="12.01" y2="8" {...common} strokeWidth={2.2}/></>,
    sparkles: <><Path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" {...common}/><Path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 2l.7 1.8L7.5 4.5l-1.8.7L5 7l-.7-1.8L2.5 4.5l1.8-.7L5 2Z" {...common}/></>,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24">{paths[name]}</Svg>;
}
