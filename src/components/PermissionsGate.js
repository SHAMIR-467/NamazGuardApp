import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { COLORS } from '../constants';
import { setPermissionsGranted } from '../services/StorageService';
import { handleAsync } from '../utils';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    icon: '📍',
    title: 'Location Access',
    arabic: 'الموقع الجغرافي',
    desc: 'NamazGuard needs your location to calculate accurate prayer times for your city. Your location never leaves your device.',
    required: true,
    btnLabel: 'Allow Location',
  },
  {
    icon: '🔔',
    title: 'Notifications',
    arabic: 'الإشعارات',
    desc: 'Receive a reminder before each prayer time and a notification when the prayer lock activates.',
    required: false,
    btnLabel: 'Allow Notifications',
  },
  {
    icon: '🕌',
    title: "You're all set!",
    arabic: 'بِسْمِ اللَّهِ',
    desc: 'NamazGuard is ready. Enable the lock toggle next to each prayer to activate focus mode during prayer times.',
    required: false,
    btnLabel: 'Start NamazGuard',
  },
];

const PermissionsGate = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [locationDenied, setLocationDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    slideAnim.setValue(40);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, [slideAnim]);

  useEffect(() => { animateIn(); }, [step]);

  const handleLocationStep = useCallback(async () => {
    setLoading(true);
    try {
      const [result, err] = await handleAsync(() =>
        Location.requestForegroundPermissionsAsync()
      );
      if (err || result?.status !== 'granted') {
        setLocationDenied(true);
      } else {
        setLocationDenied(false);
        setStep(1);
      }
    } catch (e) {
      setLocationDenied(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNotificationStep = useCallback(async () => {
    setLoading(true);
    try {
      await handleAsync(() => Notifications.requestPermissionsAsync());
    } catch (e) {
      // Notification permission is optional — continue regardless
    } finally {
      setLoading(false);
      setStep(2);
    }
  }, []);

  const handleFinish = useCallback(async () => {
    try {
      await setPermissionsGranted();
      onComplete?.();
    } catch (err) {
      console.warn('[PermissionsGate] handleFinish error:', err);
      onComplete?.();
    }
  }, [onComplete]);

  const handleAction = useCallback(() => {
    if (step === 0) handleLocationStep();
    else if (step === 1) handleNotificationStep();
    else handleFinish();
  }, [step, handleLocationStep, handleNotificationStep, handleFinish]);

  const current = STEPS[step];

  return (
    <SafeAreaView style={styles.container}>
      {/* Step dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{current.icon}</Text>
        </View>

        {/* Arabic */}
        <Text style={styles.arabic}>{current.arabic}</Text>

        {/* Title */}
        <Text style={styles.title}>{current.title}</Text>

        {/* Description */}
        <Text style={styles.desc}>{current.desc}</Text>

        {/* Location denied message */}
        {locationDenied && step === 0 && (
          <View style={styles.deniedBox}>
            <Text style={styles.deniedText}>
              📍 Location access is required for accurate prayer times. Please tap "Allow Location" to continue, or enable it manually in your device Settings.
            </Text>
          </View>
        )}

        {/* Action button */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleAction}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {loading ? 'Please wait…' : current.btnLabel}
          </Text>
        </TouchableOpacity>

        {/* Skip for optional steps */}
        {!current.required && step < 2 && (
          <TouchableOpacity onPress={() => setStep((s) => s + 1)} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Islamic geometric decoration */}
      <View style={styles.decoration} pointerEvents="none">
        <View style={styles.octagon} />
        <View style={[styles.octagon, { transform: [{ rotate: '22.5deg' }], opacity: 0.06 }]} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 48 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.whiteAlpha20,
  },
  dotActive: { backgroundColor: COLORS.gold, width: 24 },
  dotDone: { backgroundColor: COLORS.goldDark },
  content: { width: '100%', alignItems: 'center' },
  iconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 2, borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  icon: { fontSize: 44 },
  arabic: {
    fontSize: 24, fontWeight: '600',
    color: COLORS.gold, marginBottom: 8,
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 22, fontWeight: '700',
    color: COLORS.white, marginBottom: 16,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15, color: COLORS.whiteAlpha80,
    textAlign: 'center', lineHeight: 24,
    marginBottom: 32,
  },
  deniedBox: {
    backgroundColor: 'rgba(224,82,82,0.12)',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(224,82,82,0.3)',
    marginBottom: 16, width: '100%',
  },
  deniedText: { color: '#F08080', fontSize: 13, lineHeight: 20 },
  btn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 40, paddingVertical: 15,
    borderRadius: 30, width: '100%',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.navy, fontWeight: '700', fontSize: 16 },
  skipBtn: { marginTop: 16, padding: 8 },
  skipText: { color: COLORS.whiteAlpha60, fontSize: 14 },
  decoration: {
    position: 'absolute', bottom: -80, right: -80,
    opacity: 0.08, pointerEvents: 'none',
  },
  octagon: {
    width: 200, height: 200, borderRadius: 20,
    borderWidth: 2, borderColor: COLORS.gold,
    position: 'absolute',
  },
});

export default PermissionsGate;
