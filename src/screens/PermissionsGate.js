import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import {
  getPermissionsGranted, setPermissionsGranted, getSettings, saveSettings,
} from '../services/StorageService';
import { handleAsync } from '../services/PrayerTimeService';
import IslamicPattern from '../components/IslamicPattern';

const { width, height } = Dimensions.get('window');

const STEPS = [
  {
    icon: '📍',
    title: 'Location Access',
    subtitle: 'للمواقيت الدقيقة',
    description: 'NamazGuard needs your location to calculate accurate prayer times for your city.',
    action: 'Grant Location',
    skip: false,
    required: true,
  },
  {
    icon: '🔔',
    title: 'Prayer Reminders',
    subtitle: 'تنبيهات الصلاة',
    description: 'Receive gentle notifications before each Namaz time so you never miss a prayer.',
    action: 'Enable Notifications',
    skip: true,
    required: false,
  },
  {
    icon: '☪️',
    title: 'All Set',
    subtitle: 'جاهز للصلاة',
    description: 'NamazGuard will help you maintain your prayers. May Allah accept your worship.',
    action: 'Begin',
    skip: false,
    required: false,
  },
];

export default function PermissionsGate({ onGranted }) {
  const [step, setStep] = useState(0);
  const [locationStatus, setLocationStatus] = useState(null); // 'granted'|'denied'|null
  const [notifStatus,    setNotifStatus]    = useState(null);
  const [loading, setLoading]               = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    (async () => {
      try {
        const granted = await getPermissionsGranted();
        if (granted) { onGranted(); return; }
      } catch {}
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    })();
  }, []);

  const animateStep = useCallback(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim]);

  const handleAction = useCallback(async () => {
    try {
      if (step === 0) {
        setLoading(true);
        const [result] = await handleAsync(() =>
          Location.requestForegroundPermissionsAsync()
        );
        const granted = result?.status === 'granted';
        setLocationStatus(granted ? 'granted' : 'denied');

        if (granted) {
          const [loc] = await handleAsync(() =>
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          );
          if (loc) {
            const settings = await getSettings();
            const [geo] = await handleAsync(() =>
              Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              })
            );
            const city = geo?.[0]?.city || geo?.[0]?.region || 'Your City';
            await saveSettings({
              ...settings,
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              cityName: city,
              manualLocation: false,
            });
          }
          setStep(1);
          animateStep();
        }
        setLoading(false);
      } else if (step === 1) {
        setLoading(true);
        const [result] = await handleAsync(() =>
          Notifications.requestPermissionsAsync()
        );
        setNotifStatus(result?.status === 'granted' ? 'granted' : 'denied');
        setLoading(false);
        setStep(2);
        animateStep();
      } else if (step === 2) {
        await setPermissionsGranted(true);
        onGranted();
      }
    } catch (err) {
      console.warn('[PermissionsGate] handleAction error:', err.message);
      setLoading(false);
    }
  }, [step, animateStep, onGranted]);

  const handleSkip = useCallback(async () => {
    try {
      setStep(s => s + 1);
      animateStep();
    } catch {}
  }, [animateStep]);

  if (loading && !STEPS[step]) return null;

  const current = STEPS[step];

  return (
    <View style={styles.container}>
      <IslamicPattern width={width} height={height} color={COLORS.gold} />

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.icon}>{current.icon}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>
        <Text style={styles.description}>{current.description}</Text>

        {step === 0 && locationStatus === 'denied' && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              📍 Location is required for accurate prayer times. Please grant access.
            </Text>
          </View>
        )}

        {step === 1 && notifStatus === 'denied' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              You can enable notifications later in your device settings.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleAction}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{loading ? 'Please wait…' : current.action}</Text>
        </TouchableOpacity>

        {current.skip && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Bismillah footer */}
      <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.navyLight,
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
  },
  dotActive: {
    backgroundColor: COLORS.gold,
    width: 24,
  },
  dotDone: {
    backgroundColor: COLORS.goldDark,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    fontSize: 72,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.gold,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: COLORS.cream + 'AA',
    marginBottom: SPACING.lg,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  description: {
    ...FONTS.body,
    color: COLORS.mutedLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  warnBox: {
    backgroundColor: `${COLORS.danger}22`,
    borderWidth: 1,
    borderColor: `${COLORS.danger}44`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    width: '100%',
  },
  warnText: {
    ...FONTS.caption,
    color: COLORS.danger,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: `${COLORS.gold}11`,
    borderWidth: 1,
    borderColor: `${COLORS.gold}33`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    width: '100%',
  },
  infoText: {
    ...FONTS.caption,
    color: COLORS.mutedLight,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: COLORS.gold,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.full,
    width: '100%',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    ...FONTS.heading,
    color: COLORS.navy,
    fontWeight: '700',
  },
  skipBtn: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  skipText: {
    ...FONTS.caption,
    color: COLORS.muted,
  },
  bismillah: {
    position: 'absolute',
    bottom: SPACING.xl,
    fontSize: 16,
    color: COLORS.gold + '55',
    writingDirection: 'rtl',
  },
});
