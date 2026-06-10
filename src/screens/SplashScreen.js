import React, { useEffect, useRef, memo } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import IslamicPattern from '../components/IslamicPattern';

const { width, height } = Dimensions.get('window');

const SplashScreen = memo(({ onFinish }) => {
  const scaleAnim   = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textAnim    = useRef(new Animated.Value(0)).current;
  const patternAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Pattern fade in
      Animated.timing(patternAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      // Logo scale + fade
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      // Text fade in
      Animated.timing(textAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(1200),
      // Fade out
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(textAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(patternAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: patternAnim }}>
        <IslamicPattern width={width} height={height} color={COLORS.gold} />
      </Animated.View>

      <Animated.View style={[
        styles.logoWrap,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>☪️</Text>
        </View>
        <Text style={styles.logoText}>NamazGuard</Text>
        <Text style={styles.logoArabic}>حارس الصلاة</Text>
      </Animated.View>

      <Animated.View style={[styles.bottomText, { opacity: textAnim }]}>
        <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم</Text>
        <Text style={styles.tagline}>Pray on time, every time</Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoCircle: {
    width: 110, height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 2,
    borderColor: `${COLORS.gold}55`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoIcon: { fontSize: 56 },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  logoArabic: {
    fontSize: 20,
    color: COLORS.cream + 'AA',
    writingDirection: 'rtl',
  },
  bottomText: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  bismillah: {
    fontSize: 18,
    color: COLORS.gold + '88',
    writingDirection: 'rtl',
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.muted,
    letterSpacing: 1,
  },
});

export default SplashScreen;
