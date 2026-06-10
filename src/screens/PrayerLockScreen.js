import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, Vibration, Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { PRAYER_NAMES, getQiblaDirection } from '../services/PrayerTimeService';
import { getTasbihCount, saveTasbihCount } from '../services/StorageService';
import IslamicPattern from '../components/IslamicPattern';
import { useCountdown } from '../hooks/useCountdown';

const { width, height } = Dimensions.get('window');

const DHIKR_LIST = ['سُبْحَانَ اللَّه', 'الْحَمْدُ لِلَّه', 'اللَّهُ أَكْبَر'];
const DHIKR_EN   = ['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar'];

// Compass arrow — pure View-based
const QiblaCompass = memo(({ direction }) => {
  const arrowRot = `${Math.round(direction)}deg`;
  return (
    <View style={compass.container}>
      <Text style={compass.label}>Qibla Direction</Text>
      <View style={compass.circle}>
        <View style={[compass.arrow, { transform: [{ rotate: arrowRot }] }]}>
          <View style={compass.arrowHead} />
          <View style={compass.arrowBody} />
        </View>
        <Text style={compass.deg}>{Math.round(direction)}°</Text>
      </View>
      <Text style={compass.mecca}>🕋 Mecca</Text>
    </View>
  );
});

export default function PrayerLockScreen({ visible, prayerName, prayerTimes, settings, onSnooze }) {
  const [tasbihCount, setTasbihCount] = useState(0);
  const [dhikrIndex,  setDhikrIndex]  = useState(0);
  const [qibla,       setQibla]       = useState(0);
  const [snoozed,     setSnoozed]     = useState(false);

  const tapAnim  = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const dateStr  = useRef(new Date().toISOString().slice(0, 10)).current;

  const prayerInfo  = PRAYER_NAMES[prayerName] || {};
  const endTime     = prayerTimes && prayerName
    ? new Date(prayerTimes[prayerName]?.getTime() + (prayerInfo.duration ?? 15) * 60_000)
    : null;
  const countdown   = useCountdown(endTime);

  // Load tasbih count
  useEffect(() => {
    if (!visible || !prayerName) return;
    (async () => {
      try {
        const count = await getTasbihCount(prayerName, dateStr);
        setTasbihCount(count);
      } catch {}
    })();
  }, [visible, prayerName]);

  // Qibla
  useEffect(() => {
    if (!settings) return;
    try {
      const q = getQiblaDirection(settings.lat, settings.lng);
      setQibla(q);
    } catch {}
  }, [settings]);

  // Glow pulse animation
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const handleTasbih = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      // Tap animation
      Animated.sequence([
        Animated.timing(tapAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
        Animated.timing(tapAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]).start();

      const newCount = tasbihCount + 1;
      setTasbihCount(newCount);
      await saveTasbihCount(prayerName, dateStr, newCount);

      // Cycle dhikr every 33
      if (newCount % 33 === 0) {
        setDhikrIndex(i => (i + 1) % DHIKR_LIST.length);
      }
    } catch (err) {
      console.warn('[PrayerLockScreen] handleTasbih error:', err.message);
    }
  }, [tasbihCount, prayerName, dateStr, tapAnim]);

  const handleSnooze = useCallback(() => {
    try {
      setSnoozed(true);
      setTimeout(() => setSnoozed(false), 5 * 60 * 1000);
      if (onSnooze) onSnooze();
    } catch {}
  }, [onSnooze]);

  if (!prayerName) return null;

  const isVisible = visible && !snoozed;

  return (
    <Modal
      isVisible={isVisible}
      animationIn="fadeIn"
      animationOut="fadeOut"
      animationInTiming={400}
      animationOutTiming={300}
      backdropOpacity={0}
      style={styles.modal}
      useNativeDriver
      coverScreen
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <IslamicPattern width={width} height={height} color={COLORS.gold} />

        {/* Top area: Arabic prayer name + countdown */}
        <View style={styles.topSection}>
          <Animated.Text style={[styles.prayerArabic, { opacity: glowAnim }]}>
            {prayerInfo.ar}
          </Animated.Text>
          <Text style={styles.prayerEnglish}>{prayerInfo.en} Time</Text>

          <View style={styles.countdownBox}>
            <Text style={styles.countdownLabel}>Time remaining</Text>
            <Text style={styles.countdown}>{countdown.formatted}</Text>
            <Text style={styles.countdownSub}>until prayer ends</Text>
          </View>
        </View>

        {/* Qibla compass */}
        <QiblaCompass direction={qibla} />

        {/* Tasbih counter */}
        <View style={styles.tasbihSection}>
          <Text style={styles.dhikr}>{DHIKR_LIST[dhikrIndex]}</Text>
          <Text style={styles.dhikrEn}>{DHIKR_EN[dhikrIndex]}</Text>

          <Animated.View style={{ transform: [{ scale: tapAnim }] }}>
            <TouchableOpacity
              style={styles.tasbihBtn}
              onPress={handleTasbih}
              activeOpacity={0.8}
            >
              <Text style={styles.tasbihCount}>{tasbihCount}</Text>
              <Text style={styles.tasbihTap}>TAP TO COUNT</Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.tasbihProgress}>
            {tasbihCount % 33}/33 · Cycle {Math.floor(tasbihCount / 33) + 1}
          </Text>
        </View>

        {/* Lock indicator */}
        <View style={styles.lockIndicator}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockText}>NamazGuard is active</Text>
        </View>

        {/* Snooze */}
        <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze}>
          <Text style={styles.snoozeText}>Remind me in 5 min</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// Compass styles
const compass = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.mutedLight,
    marginBottom: SPACING.xs,
  },
  circle: {
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: `${COLORS.gold}55`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  arrowHead: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 16,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: COLORS.gold,
    marginBottom: -2,
  },
  arrowBody: {
    width: 3, height: 18,
    backgroundColor: `${COLORS.gold}66`,
    borderRadius: 2,
  },
  deg: {
    ...FONTS.small,
    color: COLORS.gold,
    position: 'absolute',
    bottom: 6,
  },
  mecca: {
    ...FONTS.small,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
});

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    zIndex: 9999,
  },
  overlay: {
    flex: 1,
    width, height,
    backgroundColor: 'rgba(10,20,35,0.97)',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  topSection: {
    alignItems: 'center',
  },
  prayerArabic: {
    fontSize: 52,
    fontWeight: '700',
    color: COLORS.gold,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  prayerEnglish: {
    ...FONTS.heading,
    color: COLORS.cream,
    marginTop: SPACING.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  countdownBox: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderWidth: 1,
    borderColor: `${COLORS.gold}33`,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  countdownLabel: {
    ...FONTS.small,
    color: COLORS.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  countdown: {
    fontSize: 44,
    fontWeight: '300',
    color: COLORS.cream,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  countdownSub: {
    ...FONTS.small,
    color: COLORS.muted,
  },
  tasbihSection: {
    alignItems: 'center',
    width: '100%',
  },
  dhikr: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.gold,
    writingDirection: 'rtl',
    textAlign: 'center',
    marginBottom: SPACING.xs / 2,
  },
  dhikrEn: {
    ...FONTS.caption,
    color: COLORS.muted,
    marginBottom: SPACING.md,
  },
  tasbihBtn: {
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasbihCount: {
    fontSize: 38,
    fontWeight: '700',
    color: COLORS.gold,
  },
  tasbihTap: {
    ...FONTS.small,
    color: COLORS.muted,
    letterSpacing: 1,
    marginTop: 2,
  },
  tasbihProgress: {
    ...FONTS.caption,
    color: COLORS.muted,
    marginTop: SPACING.sm,
  },
  lockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: `${COLORS.gold}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: `${COLORS.gold}33`,
  },
  lockIcon: { fontSize: 14 },
  lockText: {
    ...FONTS.caption,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  snoozeBtn: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.muted}44`,
    paddingHorizontal: SPACING.lg,
  },
  snoozeText: {
    ...FONTS.caption,
    color: COLORS.muted,
  },
});
