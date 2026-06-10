import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUND_FETCH_TASK, STORAGE_KEYS } from '../constants';
import { loadSettings } from './StorageService';
import { resolvePrayerTimes } from './PrayerTimeService';
import { schedulePrayerNotifications } from './NotificationService';
import { todayString } from '../utils';

if (Platform.OS !== 'web') {
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const settings = await loadSettings();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = await resolvePrayerTimes(settings, tomorrow);
    if (result?.times) {
      const dateStr = todayString(tomorrow);
      const s = {};
      Object.keys(result.times).forEach((k) => { s[k] = result.times[k] instanceof Date ? result.times[k].toISOString() : result.times[k]; });
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_TIMES + '_' + dateStr, JSON.stringify(s));
      await schedulePrayerNotifications(result.times, settings.notificationLead);
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.warn('[BackgroundTask]', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
}

export async function registerBackgroundFetch() {
  if (Platform.OS === 'web') return true;
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) return false;
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, { minimumInterval: 60 * 60 * 12, stopOnTerminate: false, startOnBoot: true });
    }
    return true;
  } catch (err) {
    console.warn('[registerBackgroundFetch]', err);
    return false;
  }
}

export async function unregisterBackgroundFetch() {
  if (Platform.OS === 'web') return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (isRegistered) await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
  } catch (err) { console.warn('[unregisterBackgroundFetch]', err); }
}
