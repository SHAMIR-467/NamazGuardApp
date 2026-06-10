import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isInPrayerWindow, PRAYER_NAMES } from './PrayerTimeService';
import { getLockPrefs } from './StorageService';

let intervalRef = null;
let appStateSubscription = null;
let onLockChange = null;
let currentPrayerTimes = null;

// ---------- Notification setup ----------
export async function setupNotifications() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('[LockManager] setupNotifications error:', err.message);
  }
}

export async function scheduleAdhanNotifications(prayerTimes, leadMinutes = 10) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const prayers = Object.entries(prayerTimes);
    for (const [name, time] of prayers) {
      const triggerTime = new Date(time.getTime() - leadMinutes * 60 * 1000);
      if (triggerTime > new Date()) {
        const pName = PRAYER_NAMES[name];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 ${pName.ar} — ${pName.en}`,
            body: `${pName.en} prayer in ${leadMinutes} minutes. Prepare for Namaz.`,
            sound: true,
          },
          trigger: { date: triggerTime },
        });
      }
    }
  } catch (err) {
    console.warn('[LockManager] scheduleAdhanNotifications error:', err.message);
  }
}

async function sendLockNotification(prayerName) {
  try {
    const pName = PRAYER_NAMES[prayerName];
    await Notifications.presentNotificationAsync({
      title: `🔒 ${pName.ar} — NamazGuard Active`,
      body: `${pName.en} time. Your phone is in focus mode.`,
      sound: false,
    });
  } catch (err) {
    console.warn('[LockManager] sendLockNotification error:', err.message);
  }
}

// ---------- Check lock ----------
async function checkAndLock() {
  try {
    if (!currentPrayerTimes) return;
    const lockPrefs = await getLockPrefs();

    for (const prayerName of Object.keys(PRAYER_NAMES)) {
      if (!lockPrefs[prayerName]) continue;
      if (isInPrayerWindow(currentPrayerTimes, prayerName)) {
        if (onLockChange) onLockChange({ active: true, prayerName });
        return;
      }
    }
    if (onLockChange) onLockChange({ active: false, prayerName: null });
  } catch (err) {
    console.warn('[LockManager] checkAndLock error:', err.message);
  }
}

// ---------- AppState listener ----------
function handleAppStateChange(nextState) {
  try {
    if ((nextState === 'background' || nextState === 'inactive') && currentPrayerTimes) {
      for (const prayerName of Object.keys(PRAYER_NAMES)) {
        if (isInPrayerWindow(currentPrayerTimes, prayerName)) {
          sendLockNotification(prayerName);
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[LockManager] handleAppStateChange error:', err.message);
  }
}

// ---------- Public API ----------
export function startLockManager(prayerTimes, onChange) {
  try {
    currentPrayerTimes = prayerTimes;
    onLockChange = onChange;

    if (intervalRef) clearInterval(intervalRef);
    checkAndLock();
    intervalRef = setInterval(checkAndLock, 30_000);

    if (appStateSubscription) appStateSubscription.remove();
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  } catch (err) {
    console.warn('[LockManager] startLockManager error:', err.message);
  }
}

export function stopLockManager() {
  try {
    if (intervalRef) { clearInterval(intervalRef); intervalRef = null; }
    if (appStateSubscription) { appStateSubscription.remove(); appStateSubscription = null; }
    onLockChange = null;
    currentPrayerTimes = null;
  } catch (err) {
    console.warn('[LockManager] stopLockManager error:', err.message);
  }
}

export function updatePrayerTimes(prayerTimes) {
  currentPrayerTimes = prayerTimes;
}
