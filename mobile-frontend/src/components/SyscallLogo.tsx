import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export function SyscallLogo({size=36}:{size?:number}) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Defs>
      <LinearGradient id="envLeft" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0%" stopColor="#4F46E5"/><Stop offset="100%" stopColor="#3B82F6"/></LinearGradient>
      <LinearGradient id="envRight" x1="100%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#06B6D4"/><Stop offset="100%" stopColor="#10B981"/></LinearGradient>
      <LinearGradient id="foldFlap" x1="50%" y1="0%" x2="50%" y2="100%"><Stop offset="0%" stopColor="#6366F1"/><Stop offset="100%" stopColor="#4F46E5"/></LinearGradient>
    </Defs>
    <Path d="M18 34C18 29.5817 21.5817 26 26 26H50V74H26C21.5817 74 18 70.4183 18 66V34Z" fill="url(#envLeft)"/>
    <Path d="M50 26H74C78.4183 26 82 29.5817 82 34V66C82 70.4183 78.4183 74 74 74H50V26Z" fill="url(#envRight)"/>
    <Path d="M18 28L47.2 52.8C48.8 54.2 51.2 54.2 52.8 52.8L82 28L50 56L18 28Z" fill="url(#foldFlap)" fillOpacity={0.95}/>
    <Path d="M38 64C38 64 43 68 50 68C57 68 62 64 62 64" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round"/>
    <Path d="M74 16C80 20 85 26 87 33" stroke="#06B6D4" strokeWidth={3.5} strokeLinecap="round"/>
    <Path d="M66 10C76 14 84 22 88 33" stroke="#3B82F6" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 4"/>
    <Circle cx={50} cy={46} r={3.5} fill="#FFFFFF"/>
  </Svg>;
}
