import React from 'react';
import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from 'react-native';

export function Text({ style, ...props }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const weight = String(flat.fontWeight ?? '400');
  const fontFamily = flat.fontFamily ?? (weight === '700' || weight === 'bold' ? 'Inter_700Bold' : weight === '600' || weight === 'semibold' ? 'Inter_600SemiBold' : weight === '500' || weight === 'medium' ? 'Inter_500Medium' : 'Inter_400Regular');
  return <NativeText {...props} style={[{ fontFamily, color: '#1F1F1F' }, style]} />;
}

export function DisplayText({ style, ...props }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const weight = String(flat.fontWeight ?? '600');
  const fontFamily = flat.fontFamily ?? (weight === '700' || weight === 'bold' ? 'Outfit_700Bold' : weight === '500' || weight === 'medium' ? 'Outfit_500Medium' : 'Outfit_600SemiBold');
  return <NativeText {...props} style={[{ fontFamily, color: '#1F1F1F' }, style]} />;
}
