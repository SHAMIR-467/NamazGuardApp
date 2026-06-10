import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../constants';
import { handleAsync } from '../utils';

export async function loadSettings() {
  const [raw, err] = await handleAsync(() => AsyncStorage.getItem(STORAGE_KEYS.SETTINGS));
  if (err || !raw) return { ...DEFAULT_SETTINGS };
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}

export async function saveSettings(settings) {
  const [, err] = await handleAsync(() =>
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  );
  return !err;
}

export async function loadLockSettings() {
  const defaults = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
  try {
    const keys = Object.keys(defaults).map((k) => STORAGE_KEYS.LOCK_PREFIX + k);
    const pairs = await AsyncStorage.multiGet(keys);
    const result = { ...defaults };
    pairs.forEach(([key, value]) => {
      const prayer = key.replace(STORAGE_KEYS.LOCK_PREFIX, '');
      if (value !== null) result[prayer] = value === 'true';
    });
    return result;
  } catch (err) {
    console.warn('[loadLockSettings] Error:', err);
    return defaults;
  }
}

export async function saveLockSetting(prayer, enabled) {
  const [, err] = await handleAsync(() =>
    AsyncStorage.setItem(STORAGE_KEYS.LOCK_PREFIX + prayer, String(enabled))
  );
  return !err;
}

export async function loadTasbih(dateStr, prayer) {
  const key = STORAGE_KEYS.TASBIH_PREFIX + dateStr + '/' + prayer;
  const [val] = await handleAsync(() => AsyncStorage.getItem(key));
  return parseInt(val || '0', 10);
}

export async function saveTasbih(dateStr, prayer, count) {
  const key = STORAGE_KEYS.TASBIH_PREFIX + dateStr + '/' + prayer;
  await handleAsync(() => AsyncStorage.setItem(key, String(count)));
}

export async function hasGrantedPermissions() {
  const [val] = await handleAsync(() => AsyncStorage.getItem(STORAGE_KEYS.PERMISSIONS));
  return val === 'true';
}

export async function setPermissionsGranted() {
  await handleAsync(() => AsyncStorage.setItem(STORAGE_KEYS.PERMISSIONS, 'true'));
}

export async function cachePrayerTimes(dateStr, times) {
  try {
    const s = {};
    Object.keys(times).forEach((k) => { s[k] = times[k] instanceof Date ? times[k].toISOString() : times[k]; });
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_TIMES + '_' + dateStr, JSON.stringify(s));
  } catch (err) { console.warn('[cachePrayerTimes]', err); }
}

export async function getCachedPrayerTimes(dateStr) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_TIMES + '_' + dateStr);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = {};
    Object.keys(parsed).forEach((k) => { result[k] = parsed[k] ? new Date(parsed[k]) : null; });
    return result;
  } catch { return null; }
}

export async function clearAllData() {
  const [, err] = await handleAsync(() => AsyncStorage.clear());
  return !err;
}
