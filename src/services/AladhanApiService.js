/**
 * Aladhan Prayer Times API client
 * Docs: https://aladhan.com/prayer-times-api
 */

import { CALC_METHODS, MADHABS } from '../constants';

const BASE_URL = 'https://api.aladhan.com/v1';

const PRAYER_KEY_MAP = {
  Fajr: 'fajr',
  Sunrise: 'sunrise',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
};

const API_METHOD_IDS = {
  karachi: 1,
  isna: 2,
  mwl: 3,
  makkah: 4,
  egypt: 5,
};

/** DD-MM-YYYY for Aladhan path parameter */
export function formatApiDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function getMethodId(calcMethod) {
  return API_METHOD_IDS[calcMethod] ?? CALC_METHODS[calcMethod]?.apiMethodId ?? 1;
}

function getSchoolId(madhab) {
  return madhab === 'hanafi' ? 1 : 0;
}

function buildCommonParams(settings) {
  const params = new URLSearchParams({
    method: String(getMethodId(settings.calcMethod)),
    school: String(getSchoolId(settings.madhab)),
  });
  if (settings.apiKey) params.set('x7xapikey', settings.apiKey);
  return params;
}

async function apiGet(path, params) {
  const url = `${BASE_URL}${path}?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip' },
  });
  const json = await response.json();
  if (!response.ok || json.code !== 200) {
    const msg = typeof json.data === 'string' ? json.data : json.status || 'API request failed';
    throw new Error(msg);
  }
  return json.data;
}

/** Parse "HH:mm" or "HH:mm (UTC)" into a Date on the given day */
export function parseTimeToDate(timeStr, baseDate) {
  if (!timeStr) return null;
  const clean = String(timeStr).split(' ')[0];
  const [h, m] = clean.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Convert API timings object → { fajr, sunrise, dhuhr, asr, maghrib, isha } as Dates */
export function parseApiTimings(timings, baseDate) {
  if (!timings) return null;
  const result = {};
  Object.entries(PRAYER_KEY_MAP).forEach(([apiKey, localKey]) => {
    result[localKey] = parseTimeToDate(timings[apiKey], baseDate);
  });
  return result;
}

function normalizeApiResponse(data, baseDate) {
  const times = parseApiTimings(data.timings, baseDate);
  const hijri = data.date?.hijri;
  const hijriFormatted = hijri
    ? `${hijri.day} ${hijri.month?.en || ''} ${hijri.year} AH`
    : null;

  return {
    times,
    meta: data.meta || null,
    date: data.date || null,
    hijriFormatted,
    readableDate: data.date?.readable || null,
    timezone: data.meta?.timezone || null,
    latitude: data.meta?.latitude ?? null,
    longitude: data.meta?.longitude ?? null,
  };
}

/** GET /timings/{date} — by coordinates */
export async function fetchTimingsByCoords(date, latitude, longitude, settings) {
  const params = buildCommonParams(settings);
  params.set('latitude', String(latitude));
  params.set('longitude', String(longitude));
  const data = await apiGet(`/timings/${formatApiDate(date)}`, params);
  return normalizeApiResponse(data, date);
}

/** GET /timingsByCity/{date} */
export async function fetchTimingsByCity(date, city, country, settings, state) {
  const params = buildCommonParams(settings);
  params.set('city', city);
  params.set('country', country);
  if (state) params.set('state', state);
  const data = await apiGet(`/timingsByCity/${formatApiDate(date)}`, params);
  return normalizeApiResponse(data, date);
}

/** GET /timingsByAddress/{date} */
export async function fetchTimingsByAddress(date, address, settings) {
  const params = buildCommonParams(settings);
  params.set('address', address);
  const data = await apiGet(`/timingsByAddress/${formatApiDate(date)}`, params);
  return normalizeApiResponse(data, date);
}

/** GET /nextPrayer/{date} — by coordinates (today only, server-side "now") */
export async function fetchNextPrayerByCoords(date, latitude, longitude, settings) {
  const params = buildCommonParams(settings);
  params.set('latitude', String(latitude));
  params.set('longitude', String(longitude));
  const data = await apiGet(`/nextPrayer/${formatApiDate(date)}`, params);
  return normalizeNextPrayer(data);
}

/** GET /nextPrayerByAddress/{date} */
export async function fetchNextPrayerByAddress(date, address, settings) {
  const params = buildCommonParams(settings);
  params.set('address', address);
  const data = await apiGet(`/nextPrayerByAddress/${formatApiDate(date)}`, params);
  return normalizeNextPrayer(data);
}

function normalizeNextPrayer(data) {
  const entries = Object.entries(data.timings || {});
  if (!entries.length) return null;
  const [apiName, timeStr] = entries[0];
  const key = PRAYER_KEY_MAP[apiName];
  if (!key) return null;
  const baseDate = new Date();
  const time = parseTimeToDate(timeStr, baseDate);
  if (!time) return { key, time: null, secondsLeft: 0 };
  const secondsLeft = Math.max(0, Math.floor((time - new Date()) / 1000));
  return { key, time, secondsLeft, fromApi: true };
}

/**
 * Smart fetch — picks endpoint based on settings.locationMode
 * @returns {{ times, meta, hijriFormatted, readableDate, timezone, latitude, longitude }}
 */
export async function fetchPrayerTimesFromApi(settings, date = new Date(), coords = null) {
  const mode = settings.locationMode || 'city';
  const lat = coords?.latitude ?? settings.latitude;
  const lng = coords?.longitude ?? settings.longitude;

  if (mode === 'address' && settings.address) {
    return fetchTimingsByAddress(date, settings.address, settings);
  }
  if (mode === 'city' && settings.cityName && settings.country) {
    return fetchTimingsByCity(date, settings.cityName, settings.country, settings, settings.state);
  }
  if (lat != null && lng != null) {
    return fetchTimingsByCoords(date, lat, lng, settings);
  }
  throw new Error('No location configured. Set city, address, or enable GPS.');
}

/** Next prayer from API (today) or computed from times */
export async function fetchNextPrayerFromApi(settings, date = new Date(), coords = null, prayerTimes = null) {
  const today = new Date();
  const isToday = formatApiDate(date) === formatApiDate(today);

  if (isToday) {
    try {
      const mode = settings.locationMode || 'city';
      const lat = coords?.latitude ?? settings.latitude;
      const lng = coords?.longitude ?? settings.longitude;

      if (mode === 'address' && settings.address) {
        return await fetchNextPrayerByAddress(date, settings.address, settings);
      }
      if (lat != null && lng != null) {
        return await fetchNextPrayerByCoords(date, lat, lng, settings);
      }
    } catch (err) {
      console.warn('[fetchNextPrayerFromApi]', err.message);
    }
  }

  if (!prayerTimes) return null;
  const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const now = isToday ? new Date() : (() => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; })();
  for (const key of order) {
    const t = prayerTimes[key];
    if (t && t > now) {
      return { key, time: t, secondsLeft: Math.floor((t - now) / 1000) };
    }
  }
  return { key: 'fajr', time: null, secondsLeft: 0, tomorrow: !isToday };
}

export function getLocationLabel(settings, meta) {
  if (meta?.timezone) return meta.timezone.replace(/_/g, ' ');
  if (settings.locationMode === 'address' && settings.address) return settings.address;
  if (settings.cityName && settings.country) return `${settings.cityName}, ${settings.country}`;
  return `${settings.cityName || 'Unknown'}`;
}
