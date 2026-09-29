import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { SyscallLogo } from './SyscallLogo';
import { Text } from './Text';

type LoginSplashScreenProps = { onFinish: () => void };

const SPOKE_COUNT = 24;
const MAILS_PER_SPOKE = 5;
const MAILS = Array.from({ length: SPOKE_COUNT }, (_, spoke) => {
  const angle = (-90 + (360 / SPOKE_COUNT) * spoke) * Math.PI / 180;
  return Array.from({ length: MAILS_PER_SPOKE }, (_, index) => {
    const distance = 220 + index * 48;
    return {
      id: spoke * MAILS_PER_SPOKE + index,
      x: Math.round(Math.cos(angle) * distance),
      y: Math.round(Math.sin(angle) * distance),
      duration: Math.round(distance / 0.25),
      scale: 0.76 + (index % 2) * 0.08,
    };
  });
}).flat();

export function LoginSplashScreen({ onFinish }: LoginSplashScreenProps) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [logoScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, 1950);
    const pulseTimer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.16, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 1280);
    const finishTimer = setTimeout(onFinish, 2250);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(pulseTimer);
      clearTimeout(finishTimer);
    };
  }, [logoScale, onFinish, opacity]);

  return (
    <Animated.View pointerEvents="auto" style={[styles.overlay, { opacity }]}>
      {MAILS.map((mail) => <FlyingEnvelope key={mail.id} {...mail} />)}
      <Animated.View style={[styles.logoAnchor, { transform: [{ scale: logoScale }] }]}>
        <SyscallLogo size={88} />
      </Animated.View>
      <View style={styles.brandTitleWrap}>
        <Text style={styles.brandTitle}>Syscall</Text>
        <Text style={styles.brandSubtitle}>Opening your mailbox...</Text>
      </View>
    </Animated.View>
  );
}

function FlyingEnvelope({ x, y, duration, scale }: { x: number; y: number; duration: number; scale: number }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [duration, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [x, 0] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [y, 0] });
  const envelopeScale = progress.interpolate({ inputRange: [0, 1], outputRange: [scale * 1.1, 0.04] });
  const envelopeOpacity = progress.interpolate({ inputRange: [0, 0.08, 0.88, 1], outputRange: [0, 0.95, 0.95, 0] });

  return (
    <Animated.View style={[styles.envelope, {
      opacity: envelopeOpacity,
      transform: [{ translateX }, { translateY }, { scale: envelopeScale }],
    }]}>
      <Svg width={28} height={22} viewBox="0 0 24 24" fill="#EDF4FE">
        <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#0B57D0" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="22,6 12,13 2,6" fill="none" stroke="#0B57D0" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, elevation: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  envelope: { position: 'absolute', left: '50%', top: '50%', width: 28, height: 22, marginLeft: -14, marginTop: -11 },
  logoAnchor: { position: 'absolute', left: '50%', top: '50%', width: 120, height: 120, marginLeft: -60, marginTop: -60, alignItems: 'center', justifyContent: 'center', borderRadius: 60 },
  brandTitleWrap: { position: 'absolute', left: 0, right: 0, top: '50%', transform: [{ translateY: 80 }], alignItems: 'center', justifyContent: 'center', gap: 6 },
  brandTitle: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: '#0B57D0', letterSpacing: -0.4 },
  brandSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#5E6674' },
});
