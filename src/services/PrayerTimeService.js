/**
 * PrayerTimeService — Aladhan API (primary) with local sun-angle fallback.
 */

import { CALC_METHODS, MADHABS } from '../constants';
import {
  fetchPrayerTimesFromApi,
  fetchNextPrayerFromApi,
} from './AladhanApiService';

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

function fixAngle(a) {
  a = a - 360 * Math.floor(a / 360);
  if (a < 0) a += 360;
  return a;
}

function fixHour(h) {
  h = h - 24 * Math.floor(h / 24);
  if (h < 0) h += 24;
  return h;
}

function julianDate(year, month, day) {
  if (month <= 2) { year--; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(toRad(g)) + 0.020 * Math.sin(toRad(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const RA = toDeg(Math.atan2(Math.cos(toRad(e)) * Math.sin(toRad(L)), Math.cos(toRad(L)))) / 15;
  const d = toDeg(Math.asin(Math.sin(toRad(e)) * Math.sin(toRad(L))));
  const EqT = q / 15 - fixHour(RA);
  return { declination: d, equation: EqT };
}

function computeTime(jd, lat, angle, direction) {
  const { declination } = sunPosition(jd);
  const cosT =
    (Math.cos(toRad(angle)) - Math.sin(toRad(lat)) * Math.sin(toRad(declination))) /
    (Math.cos(toRad(lat)) * Math.cos(toRad(declination)));
  if (cosT < -1) return direction === 'ccw' ? 0 : 12;
  if (cosT > 1) return direction === 'ccw' ? 12 : 0;
  const T = toDeg(Math.acos(cosT)) / 15;
  return direction === 'ccw' ? 12 - T : 12 + T;
}

function asrAngle(shadowRatio, declination, lat) {
  const target = shadowRatio + Math.tan(toRad(Math.abs(lat - declination)));
  return 90 - toDeg(Math.atan(target));
}

export function calculatePrayerTimes(lat, lng, date, calcMethod = 'karachi', madhab = 'hanafi') {
  try {
    const method = CALC_METHODS[calcMethod] || CALC_METHODS.karachi;
    const madhabData = MADHABS[madhab] || MADHABS.hanafi;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const jd = julianDate(year, month, day);
    const { declination, equation } = sunPosition(jd);
    const tzOffset = -date.getTimezoneOffset() / 60;
    const midday = fixHour(12 - lng / 15 - equation + tzOffset);
    const fajrHour    = midday - computeTime(jd, lat, 90 + method.fajrAngle, 'ccw');
    const sunriseHour = midday - computeTime(jd, lat, 90.833, 'ccw');
    const dhuhrHour   = midday + 0.016;
    const asrHour     = midday + computeTime(jd, lat, asrAngle(madhabData.shadowRatio, declination, lat), 'cw');
    const sunsetHour  = midday + computeTime(jd, lat, 90.833, 'cw');
    const maghribHour = sunsetHour + 0.033;
    let ishaHour;
    if (calcMethod === 'makkah') {
      ishaHour = maghribHour + 1.5;
    } else {
      ishaHour = midday + computeTime(jd, lat, 90 + method.ishaAngle, 'cw');
    }
    const toDate = (h) => {
      const d = new Date(date);
      const totalMin = Math.round(h * 60);
      d.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
      return d;
    };
    return {
      fajr:    toDate(fajrHour),
      sunrise: toDate(sunriseHour),
      dhuhr:   toDate(dhuhrHour),
      asr:     toDate(asrHour),
      maghrib: toDate(maghribHour),
      isha:    toDate(ishaHour),
    };
  } catch (err) {
    console.warn('[PrayerTimeService] Calculation error:', err);
    return null;
  }
}

export function getNextPrayer(prayerTimes, now = new Date()) {
  try {
    const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const key of order) {
      const t = prayerTimes[key];
      if (t && t > now) {
        const diff = Math.floor((t - now) / 1000);
        return { key, time: t, secondsLeft: diff };
      }
    }
    return { key: 'fajr', time: null, secondsLeft: 0, tomorrow: true };
  } catch (err) {
    console.warn('[getNextPrayer] Error:', err);
    return null;
  }
}

export function getActivePrayer(prayerTimes, lockSettings, now = new Date()) {
  try {
    const DURATIONS = { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 20 };
    const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const key of order) {
      if (!lockSettings[key]) continue;
      const start = prayerTimes[key];
      if (!start) continue;
      const end = new Date(start.getTime() + DURATIONS[key] * 60 * 1000);
      if (now >= start && now <= end) return key;
    }
    return null;
  } catch (err) {
    console.warn('[getActivePrayer] Error:', err);
    return null;
  }
}

export function formatTime(date) {
  if (!date) return '--:--';
  try {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return '--:--';
  }
}

export function secondsToHMS(seconds) {
  if (!seconds || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Fetch prayer times — Aladhan API first, local math as fallback */
export async function resolvePrayerTimes(settings, date = new Date(), coords = null) {
  try {
    const apiResult = await fetchPrayerTimesFromApi(settings, date, coords);
    if (apiResult?.times) return { ...apiResult, source: 'api' };
  } catch (err) {
    console.warn('[resolvePrayerTimes] API failed, using local calc:', err.message);
  }

  const lat = coords?.latitude ?? settings.latitude;
  const lng = coords?.longitude ?? settings.longitude;
  const times = calculatePrayerTimes(lat, lng, date, settings.calcMethod, settings.madhab);
  if (!times) throw new Error('Could not calculate prayer times.');
  return { times, meta: null, hijriFormatted: null, readableDate: null, timezone: null, source: 'local' };
}

/** Next prayer — API for today, computed otherwise */
export async function resolveNextPrayer(settings, date, coords, prayerTimes) {
  try {
    const next = await fetchNextPrayerFromApi(settings, date, coords, prayerTimes);
    if (next) return next;
  } catch (err) {
    console.warn('[resolveNextPrayer]', err.message);
  }
  return getNextPrayer(prayerTimes);
}
