import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PRAYERS } from '../constants';
import { handleAsync } from '../utils';

if (Platform.OS !== 'web') {
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
}

const dateTrigger = (date) => ({
  type: Notifications.SchedulableTriggerInputTypes.DATE,
  date,
});

// ─── Request permission ────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;
  const [result, err] = await handleAsync(() => Notifications.requestPermissionsAsync());
  if (err) return false;
  return result?.status === 'granted';
}

export async function getNotificationPermissionStatus() {
  const [result] = await handleAsync(() => Notifications.getPermissionsAsync());
  return result?.status || 'undetermined';
}

// ─── Schedule all prayer notifications for today ───────────────────────────────
export async function schedulePrayerNotifications(prayerTimes, leadMinutes = 10) {
  if (Platform.OS === 'web') return;
  try {
    // Cancel existing before rescheduling
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    for (const prayer of PRAYERS) {
      const prayerTime = prayerTimes[prayer.key];
      if (!prayerTime) continue;

      const leadTime = new Date(prayerTime.getTime() - leadMinutes * 60 * 1000);
      if (leadTime <= now) continue;

      await handleAsync(() =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: `${prayer.icon} ${prayer.arabic} — ${prayer.english}`,
            body: `Prayer time in ${leadMinutes} minutes. NamazGuard will activate your focus lock.`,
            sound: true,
            data: { prayerKey: prayer.key },
          },
          trigger: dateTrigger(leadTime),
        })
      );

      // Also notify AT prayer time
      if (prayerTime > now) {
        await handleAsync(() =>
          Notifications.scheduleNotificationAsync({
            content: {
              title: `🕌 ${prayer.arabic} time has begun`,
              body: `NamazGuard is active. Focus on your prayer.`,
              sound: true,
              data: { prayerKey: prayer.key, active: true },
            },
            trigger: dateTrigger(prayerTime),
          })
        );
      }
    }
  } catch (err) {
    console.warn('[schedulePrayerNotifications] Error:', err);
  }
}

// ─── Send immediate notification (for AppState lock) ──────────────────────────
export async function sendImmediateLockNotification(prayerName, prayerArabic) {
  if (Platform.OS === 'web') return;
  await handleAsync(() =>
    Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${prayerArabic} — ${prayerName}`,
        body: 'NamazGuard is active. Your phone is in prayer mode.',
        sound: false,
      },
      trigger: null, // immediate
    })
  );
}

// ─── Cancel all notifications ─────────────────────────────────────────────────
export async function cancelAllNotifications() {
  await handleAsync(() => Notifications.cancelAllScheduledNotificationsAsync());
}
