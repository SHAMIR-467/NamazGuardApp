import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, SafeAreaView, Vibration, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, PRAYERS } from '../constants';
import { secondsToHMS } from '../services/PrayerTimeService';
import { loadTasbih, saveTasbih } from '../services/StorageService';
import { getQiblaDirection, todayString } from '../utils';

const TASBIH_TARGET = 33;

const PrayerLockScreen = ({ visible, prayerKey, prayerEndTime, settings, onSnooze, onDismiss }) => {
  const prayer = PRAYERS.find((p) => p.key === prayerKey) || PRAYERS[4];
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tasbihCount, setTasbihCount] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const tapScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (!visible || !prayerEndTime) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((prayerEndTime - new Date()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, prayerEndTime]);

  // Pulse animation
  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [visible]);

  // Load tasbih + qibla
  useEffect(() => {
    if (!visible || !prayerKey) return;
    const init = async () => {
      try {
        const count = await loadTasbih(todayString(), prayerKey);
        setTasbihCount(count);
        if (settings?.latitude && settings?.longitude) {
          setQiblaAngle(getQiblaDirection(settings.latitude, settings.longitude));
        }
      } catch (err) {
        console.warn('[PrayerLockScreen] Init error:', err);
      }
    };
    init();
  }, [visible, prayerKey, settings]);

  const handleTasbihTap = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.sequence([
        Animated.timing(tapScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
        Animated.timing(tapScale, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();
      const next = tasbihCount + 1;
      setTasbihCount(next);
      await saveTasbih(todayString(), prayerKey, next);
      if (next % TASBIH_TARGET === 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([0, 100, 50, 100]);
      }
    } catch (err) {
      console.warn('[handleTasbihTap]', err);
    }
  }, [tasbihCount, prayerKey]);

  const handleSnooze = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSnooze?.();
    } catch (err) {
      console.warn('[handleSnooze]', err);
    }
  }, [onSnooze]);

  const tasbihProgress = ((tasbihCount % TASBIH_TARGET) / TASBIH_TARGET) * 100;
  const roundsComplete = Math.floor(tasbihCount / TASBIH_TARGET);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        {/* Geometric pattern background */}
        <View style={styles.patternOverlay} pointerEvents="none">
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.hexRing, { opacity: 0.04 + i * 0.015, transform: [{ scale: 0.5 + i * 0.3 }] }]} />
          ))}
        </View>

        <SafeAreaView style={styles.safe}>
          {/* Lock icon + prayer info */}
          <View style={styles.topSection}>
            <Animated.Text style={[styles.lockIcon, { transform: [{ scale: pulseAnim }] }]}>
              🔒
            </Animated.Text>
            <Text style={styles.arabicName}>{prayer.arabic}</Text>
            <Text style={styles.englishName}>{prayer.english} Prayer</Text>
            <Text style={styles.subtitle}>NamazGuard is active</Text>
          </View>

          {/* Countdown */}
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>Time remaining</Text>
            <Text style={styles.countdown}>{secondsToHMS(secondsLeft)}</Text>
            <Text style={styles.countdownSub}>Focus on your prayer</Text>
          </View>

          {/* Qibla */}
          <View style={styles.qiblaRow}>
            <View style={styles.qiblaBox}>
              <Text style={[styles.qiblaArrow, { transform: [{ rotate: `${qiblaAngle}deg` }] }]}>🧭</Text>
              <Text style={styles.qiblaLabel}>Qibla</Text>
              <Text style={styles.qiblaDeg}>{Math.round(qiblaAngle)}°</Text>
            </View>

            {/* Tasbih counter */}
            <Animated.View style={{ transform: [{ scale: tapScale }] }}>
              <TouchableOpacity style={styles.tasbihBtn} onPress={handleTasbihTap} activeOpacity={0.85}>
                <Text style={styles.tasbihCount}>{tasbihCount % TASBIH_TARGET}</Text>
                <Text style={styles.tasbihTarget}>/ {TASBIH_TARGET}</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.qiblaBox}>
              <Text style={styles.roundsNum}>{roundsComplete}</Text>
              <Text style={styles.qiblaLabel}>Rounds</Text>
              <Text style={styles.qiblaDeg}>complete</Text>
            </View>
          </View>

          {/* Tasbih progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${tasbihProgress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Tasbih · Tap the counter · Total: {tasbihCount}
          </Text>

          {/* Snooze button */}
          <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze}>
            <Text style={styles.snoozeTxt}>⏰ Remind me in 5 minutes</Text>
          </TouchableOpacity>

          <Text style={styles.footerTxt}>
            جَزَاكَ اللَّهُ خَيْرًا · Jazakallahu Khayran
          </Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 16, 28, 0.97)',
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 24 },
  topSection: { alignItems: 'center' },
  lockIcon: { fontSize: 52, marginBottom: 12 },
  arabicName: {
    fontSize: 38,
    fontWeight: '700',
    color: COLORS.gold,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  englishName: { fontSize: 20, color: COLORS.whiteAlpha80, marginTop: 4 },
  subtitle: { fontSize: 13, color: COLORS.whiteAlpha60, marginTop: 4 },
  countdownCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    width: '100%',
  },
  countdownLabel: { fontSize: 12, color: COLORS.whiteAlpha60, letterSpacing: 1.5, textTransform: 'uppercase' },
  countdown: { fontSize: 52, fontWeight: '300', color: COLORS.gold, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  countdownSub: { fontSize: 13, color: COLORS.whiteAlpha60, marginTop: 4 },
  qiblaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  qiblaBox: { alignItems: 'center', flex: 1 },
  qiblaArrow: { fontSize: 36 },
  qiblaLabel: { fontSize: 11, color: COLORS.whiteAlpha60, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  qiblaDeg: { fontSize: 13, color: COLORS.gold, fontWeight: '600', marginTop: 2 },
  tasbihBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasbihCount: { fontSize: 34, fontWeight: '700', color: COLORS.gold },
  tasbihTarget: { fontSize: 12, color: COLORS.whiteAlpha60 },
  roundsNum: { fontSize: 28, fontWeight: '700', color: COLORS.goldLight },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 2 },
  progressLabel: { fontSize: 11, color: COLORS.whiteAlpha60, marginTop: 6 },
  snoozeBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  snoozeTxt: { color: COLORS.whiteAlpha80, fontSize: 14 },
  footerTxt: {
    fontSize: 13,
    color: COLORS.whiteAlpha60,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

export default PrayerLockScreen;
