import { MECCA } from '../constants';

// ─── handleAsync - [data, error] tuple pattern ─────────────────────────────────
export async function handleAsync(fn) {
  try {
    const data = await fn();
    return [data, null];
  } catch (error) {
    console.warn('[handleAsync]', error?.message || error);
    return [null, error];
  }
}

// ─── Gregorian to Hijri date ───────────────────────────────────────────────────
export function toHijri(date) {
  try {
    const jd = Math.floor(
      (14 + Math.floor((date.getMonth() + 1 + 9) / 12)) * -1 +
        Math.floor(date.getFullYear() / 100) * 75 +
        Math.floor((date.getFullYear() % 100) / 4) +
        date.getDate() +
        Math.floor(((date.getMonth() + 1) * 306 + 5) / 10) +
        Math.floor((date.getFullYear() - Math.floor((date.getMonth() + 8) / 11)) * 365.25) -
        694013.5 +
        2400000
    );

    let l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
      Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l =
      l -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const month = Math.floor((24 * l) / 709);
    const day = l - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;

    const HIJRI_MONTHS = [
      'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
      'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
      'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
    ];

    return {
      day,
      month,
      year,
      monthName: HIJRI_MONTHS[month - 1] || '',
      formatted: `${day} ${HIJRI_MONTHS[month - 1]} ${year} AH`,
    };
  } catch (err) {
    console.warn('[toHijri] Error:', err);
    return { day: 0, month: 0, year: 0, monthName: '', formatted: '' };
  }
}

// ─── Qibla direction ──────────────────────────────────────────────────────────
export function getQiblaDirection(lat, lng) {
  try {
    const φ1 = (lat * Math.PI) / 180;
    const φ2 = (MECCA.lat * Math.PI) / 180;
    const Δλ = ((MECCA.lng - lng) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  } catch (err) {
    console.warn('[getQiblaDirection] Error:', err);
    return 0;
  }
}

// ─── Haversine distance (km) ───────────────────────────────────────────────────
export function haversineDistance(lat1, lng1, lat2, lng2) {
  try {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  } catch {
    return 0;
  }
}

// ─── Format Gregorian date ─────────────────────────────────────────────────────
export function formatGregorianDate(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Today date string (YYYY-MM-DD) ───────────────────────────────────────────
export function todayString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isSameDay(a, b) {
  const d1 = a instanceof Date ? a : new Date(a);
  const d2 = b instanceof Date ? b : new Date(b);
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

export function formatClockTime(date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
