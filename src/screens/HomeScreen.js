import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, AppState,
  useColorScheme, RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { COLORS, PRAYERS, DEFAULT_SETTINGS } from '../constants';
import {
  getNextPrayer, getActivePrayer, secondsToHMS, resolvePrayerTimes, resolveNextPrayer, formatTime,
} from '../services/PrayerTimeService';
import { getLocationLabel } from '../services/AladhanApiService';
import {
  loadSettings, loadLockSettings, saveLockSetting,
  cachePrayerTimes, getCachedPrayerTimes,
} from '../services/StorageService';
import { schedulePrayerNotifications, sendImmediateLockNotification } from '../services/NotificationService';
import {
  toHijri, formatGregorianDate, haversineDistance, todayString, handleAsync,
  isSameDay, formatClockTime, addDays,
} from '../utils';
import { HomeScreenSkeleton } from '../components/SkeletonLoader';
import PrayerRow from '../components/PrayerRow';
import PrayerLockScreen from '../components/PrayerLockScreen';
import SettingsScreen from '../screens/SettingsScreen';

const DURATIONS = { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 20 };

const HomeScreen = () => {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [lockSettings, setLockSettings] = useState({ fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true });
  const [nextPrayer, setNextPrayer] = useState(null);
  const [activePrayerKey, setActivePrayerKey] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(null);
  const [hijriDate, setHijriDate] = useState({ formatted: '' });
  const [todayGregorian, setTodayGregorian] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(formatClockTime());
  const [apiMeta, setApiMeta] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [dataSource, setDataSource] = useState('api');
  const [error, setError] = useState(null);

  const lockIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const lastCoordsRef = useRef(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
  const colors = isDark
    ? { bg: COLORS.navy, card: COLORS.navyMid, text: COLORS.white, sub: COLORS.whiteAlpha60, border: COLORS.whiteAlpha10 }
    : { bg: COLORS.lightBg, card: COLORS.lightCard, text: COLORS.lightText, sub: COLORS.lightSubtext, border: COLORS.lightBorder };

  const fetchPrayerTimes = useCallback(async (s, targetDate = new Date(), useLocation = true) => {
    try {
      setError(null);
      const dateKey = todayString(targetDate);
      const viewingToday = isSameDay(targetDate, new Date());

      if (viewingToday) {
        const cached = await getCachedPrayerTimes(dateKey);
        if (cached) setPrayerTimes(cached);
      }

      let coords = null;
      let lat = s.latitude;
      let lng = s.longitude;

      if (useLocation && (s.locationMode === 'coords' || !s.locationMode)) {
        const [locData] = await handleAsync(() =>
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        );
        if (locData?.coords) {
          const { latitude: newLat, longitude: newLng } = locData.coords;
          const last = lastCoordsRef.current;
          if (!last || haversineDistance(last.lat, last.lng, newLat, newLng) > 1) {
            lastCoordsRef.current = { lat: newLat, lng: newLng };
            lat = newLat;
            lng = newLng;
          }
          coords = { latitude: lat, longitude: lng };
        }
      }

      const result = await resolvePrayerTimes(s, targetDate, coords);
      if (result?.times) {
        setPrayerTimes(result.times);
        setApiMeta(result.meta);
        setDataSource(result.source);
        setLocationLabel(getLocationLabel(s, result.meta));
        if (result.hijriFormatted) {
          setHijriDate({ formatted: result.hijriFormatted });
        } else {
          setHijriDate(toHijri(targetDate));
        }
        setTodayGregorian(result.readableDate || formatGregorianDate(targetDate));

        if (viewingToday) {
          await cachePrayerTimes(dateKey, result.times);
          await schedulePrayerNotifications(result.times, s.notificationLead);
        }

        if (viewingToday) {
          const next = await resolveNextPrayer(s, targetDate, coords, result.times);
          if (next) {
            setNextPrayer(next);
            setCountdown(next.secondsLeft);
            setTotalSeconds(next.secondsLeft);
          }
        }
      }
    } catch (err) {
      console.warn('[fetchPrayerTimes]', err);
      setError(err.message || 'Prayer times could not be loaded. Check location settings.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const [s] = await handleAsync(() => loadSettings());
        const [locks] = await handleAsync(() => loadLockSettings());
        if (!mounted) return;
        const finalSettings = s || DEFAULT_SETTINGS;
        setSettings(finalSettings);
        if (locks) setLockSettings(locks);
        setSelectedDate(new Date());
        await fetchPrayerTimes(finalSettings, new Date(), true);
      } catch (err) {
        console.warn('[init]', err);
        setError('Failed to initialize. Please restart the app.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  const viewingToday = isSameDay(selectedDate, new Date());

  const memoNextPrayer = useMemo(() => {
    if (!prayerTimes) return null;
    if (!viewingToday) {
      const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const first = order.find((k) => prayerTimes[k]);
      return first ? { key: first, time: prayerTimes[first], secondsLeft: 0, scheduled: true } : null;
    }
    return nextPrayer || getNextPrayer(prayerTimes);
  }, [prayerTimes, nextPrayer, viewingToday]);

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(formatClockTime()), 1000);
    return () => clearInterval(tick);
  }, []);

  const memoActivePrayer = useMemo(() => {
    if (!prayerTimes || !viewingToday) return null;
    return getActivePrayer(prayerTimes, lockSettings);
  }, [prayerTimes, lockSettings, viewingToday]);

  useEffect(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (!memoNextPrayer || !viewingToday) return;
    setCountdown(memoNextPrayer.secondsLeft);
    setTotalSeconds(memoNextPrayer.secondsLeft);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownIntervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
  }, [memoNextPrayer?.key, viewingToday]);

  useEffect(() => {
    if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    const checkLock = () => {
      try {
        if (!prayerTimes) return;
        const active = getActivePrayer(prayerTimes, lockSettings);
        setActivePrayerKey(active);
        if (active && !snoozedUntil) setShowLock(true);
        else if (!active) setShowLock(false);
      } catch (err) { console.warn('[LockManager]', err); }
    };
    checkLock();
    lockIntervalRef.current = setInterval(checkLock, 30000);
    return () => { if (lockIntervalRef.current) clearInterval(lockIntervalRef.current); };
  }, [prayerTimes, lockSettings, snoozedUntil]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      try {
        if (appStateRef.current === 'active' && (nextState === 'background' || nextState === 'inactive')) {
          const activeKey = activePrayerKey;
          if (activeKey) {
            const p = PRAYERS.find((x) => x.key === activeKey);
            if (p) await sendImmediateLockNotification(p.english, p.arabic);
          }
        }
        appStateRef.current = nextState;
      } catch (err) { console.warn('[AppState]', err); }
    });
    return () => sub?.remove();
  }, [activePrayerKey]);

  useEffect(() => {
    if (!snoozedUntil) return;
    const ms = snoozedUntil - Date.now();
    if (ms <= 0) { setSnoozedUntil(null); return; }
    const t = setTimeout(() => setSnoozedUntil(null), ms);
    return () => clearTimeout(t);
  }, [snoozedUntil]);

  const handleLockToggle = useCallback(async (prayerKey, enabled) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLockSettings((prev) => ({ ...prev, [prayerKey]: enabled }));
      await saveLockSetting(prayerKey, enabled);
    } catch (err) { console.warn('[handleLockToggle]', err); }
  }, []);

  const handleSnooze = useCallback(() => {
    setShowLock(false);
    setSnoozedUntil(Date.now() + 5 * 60 * 1000);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPrayerTimes(settingsRef.current, selectedDate, true);
    setRefreshing(false);
  }, [fetchPrayerTimes, selectedDate]);

  const handleSettingsSave = useCallback(async (newSettings) => {
    setSettings(newSettings);
    await fetchPrayerTimes(newSettings, selectedDate, false);
  }, [fetchPrayerTimes, selectedDate]);

  const handleDateChange = useCallback(async (days) => {
    const newDate = addDays(selectedDate, days);
    setSelectedDate(newDate);
    setLoading(true);
    await fetchPrayerTimes(settingsRef.current, newDate, false);
    setLoading(false);
  }, [selectedDate, fetchPrayerTimes]);

  const handleGoToday = useCallback(async () => {
    const today = new Date();
    setSelectedDate(today);
    setLoading(true);
    await fetchPrayerTimes(settingsRef.current, today, true);
    setLoading(false);
  }, [fetchPrayerTimes]);

  if (showSettings) {
    return (
      <SettingsScreen
        settings={settings}
        onSettingsChange={handleSettingsSave}
        onBack={() => setShowSettings(false)}
        isDark={isDark}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.navy }]}>
        <HomeScreenSkeleton />
      </SafeAreaView>
    );
  }

  const nextPrayerData = PRAYERS.find((p) => p.key === memoNextPrayer?.key);
  const prayerEnd = activePrayerKey && prayerTimes
    ? new Date(prayerTimes[activePrayerKey].getTime() + DURATIONS[activePrayerKey] * 60 * 1000)
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>السَّلَامُ عَلَيْكُمْ</Text>
            <Text style={[styles.gregorian, { color: colors.sub }]}>{todayGregorian}</Text>
            <Text style={[styles.hijri, { color: colors.sub }]}>{hijriDate.formatted}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={[styles.settingsBtn, { backgroundColor: colors.card }]}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Live clock */}
        <View style={[styles.clockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.clockLabel, { color: colors.sub }]}>CURRENT TIME</Text>
          <Text style={styles.clockTime}>{currentTime}</Text>
          {apiMeta?.timezone ? (
            <Text style={[styles.clockTz, { color: colors.sub }]}>🌐 {apiMeta.timezone.replace(/_/g, ' ')}</Text>
          ) : null}
        </View>

        {/* Date navigation */}
        <View style={[styles.dateNav, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => handleDateChange(-1)} style={styles.dateBtn}>
            <Text style={[styles.dateBtnText, { color: COLORS.gold }]}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleGoToday} style={styles.dateCenter}>
            <Text style={[styles.dateCenterText, { color: colors.text }]}>
              {viewingToday ? 'Today' : 'Go to Today'}
            </Text>
            {!viewingToday ? (
              <Text style={[styles.dateSubText, { color: colors.sub }]}>Viewing selected date</Text>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDateChange(1)} style={styles.dateBtn}>
            <Text style={[styles.dateBtnText, { color: COLORS.gold }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={[styles.locationTag, { backgroundColor: colors.card }]}>
          <Text style={[styles.locationText, { color: colors.sub }]}>
            📍 {locationLabel || `${settings.cityName}, ${settings.country || ''}`}
          </Text>
          <Text style={[styles.locationMeta, { color: colors.sub }]}>
            {settings.calcMethod?.toUpperCase()} · {dataSource === 'api' ? 'Aladhan API' : 'Local calc'}
            {apiMeta?.latitude != null ? ` · ${apiMeta.latitude.toFixed(2)}°, ${apiMeta.longitude.toFixed(2)}°` : ''}
          </Text>
        </View>

        {/* Next prayer card */}
        {nextPrayerData && (
          <View style={[styles.nextCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(201,168,76,0.2)' : colors.border }]}>
            <View style={styles.nextCardLeft}>
              <Text style={[styles.nextLabel, { color: colors.sub }]}>NEXT PRAYER</Text>
              <Text style={styles.nextArabic}>{nextPrayerData.arabic}</Text>
              <Text style={[styles.nextEnglish, { color: colors.text }]}>{nextPrayerData.english}</Text>
              {memoNextPrayer?.tomorrow ? <Text style={[styles.nextSub, { color: colors.sub }]}>Tomorrow</Text> : null}
            </View>
            <View style={styles.nextCardRight}>
              <Text style={styles.nextIcon}>{nextPrayerData.icon}</Text>
              <Text style={styles.countdownText}>
                {viewingToday ? secondsToHMS(countdown) : formatTime(memoNextPrayer?.time)}
              </Text>
              <Text style={[styles.countdownLabel, { color: colors.sub }]}>
                {viewingToday ? 'remaining' : 'scheduled'}
              </Text>
            </View>
          </View>
        )}

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Prayer list */}
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              {viewingToday ? "Today's Prayers" : 'Prayer Times'}
            </Text>
            <Text style={[styles.listSub, { color: colors.sub }]}>Toggle to enable lock 🔒</Text>
          </View>
          {PRAYERS.map((prayer) => (
            <PrayerRow
              key={prayer.key}
              prayer={prayer}
              time={prayerTimes?.[prayer.key]}
              isLocked={lockSettings[prayer.key]}
              isActive={memoActivePrayer === prayer.key}
              isNext={memoNextPrayer?.key === prayer.key && memoActivePrayer !== prayer.key}
              isDark={isDark}
              onToggle={handleLockToggle}
            />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.sub }]}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          <Text style={[styles.footerSub, { color: colors.sub }]}>Pull to refresh prayer times</Text>
        </View>
      </ScrollView>

      {/* Lock screen */}
      <PrayerLockScreen
        visible={showLock}
        prayerKey={activePrayerKey}
        prayerEndTime={prayerEnd}
        settings={settings}
        onSnooze={handleSnooze}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.gold, writingDirection: 'rtl' },
  gregorian: { fontSize: 12, marginTop: 4 },
  hijri: { fontSize: 12, marginTop: 2 },
  settingsBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 20 },
  clockCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center' },
  clockLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  clockTime: { fontSize: 36, fontWeight: '300', color: COLORS.gold, marginTop: 4, fontVariant: ['tabular-nums'] },
  clockTz: { fontSize: 12, marginTop: 4 },
  dateNav: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 8 },
  dateBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dateBtnText: { fontSize: 28, fontWeight: '300' },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateCenterText: { fontSize: 15, fontWeight: '600' },
  dateSubText: { fontSize: 11, marginTop: 2 },
  locationTag: { marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  locationText: { fontSize: 13, fontWeight: '500' },
  locationMeta: { fontSize: 11, marginTop: 3 },
  nextCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextCardLeft: { flex: 1 },
  nextLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  nextArabic: { fontSize: 32, fontWeight: '700', color: COLORS.gold, marginTop: 4, writingDirection: 'rtl' },
  nextEnglish: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  nextSub: { fontSize: 12, marginTop: 2 },
  nextCardRight: { alignItems: 'center', marginLeft: 16 },
  nextIcon: { fontSize: 36 },
  countdownText: { fontSize: 20, fontWeight: '600', color: COLORS.gold, marginTop: 6, fontVariant: ['tabular-nums'] },
  countdownLabel: { fontSize: 11, marginTop: 2 },
  errorBanner: { marginHorizontal: 16, backgroundColor: 'rgba(224,82,82,0.12)', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(224,82,82,0.3)' },
  errorBannerText: { color: COLORS.danger, fontSize: 13 },
  listCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, borderWidth: 0.5, overflow: 'hidden' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  listTitle: { fontSize: 16, fontWeight: '600' },
  listSub: { fontSize: 11 },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  footerText: { fontSize: 14, writingDirection: 'rtl' },
  footerSub: { fontSize: 11 },
});

export default HomeScreen;
