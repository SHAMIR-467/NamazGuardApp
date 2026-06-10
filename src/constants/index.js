// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  navy: '#0D1B2A',
  navyMid: '#122333',
  navyLight: '#1A3A5C',
  gold: '#C9A84C',
  goldLight: '#E8C876',
  goldDark: '#A07830',
  white: '#FFFFFF',
  whiteAlpha80: 'rgba(255,255,255,0.8)',
  whiteAlpha60: 'rgba(255,255,255,0.6)',
  whiteAlpha20: 'rgba(255,255,255,0.2)',
  whiteAlpha10: 'rgba(255,255,255,0.1)',
  black: '#000000',
  blackAlpha80: 'rgba(0,0,0,0.8)',
  blackAlpha50: 'rgba(0,0,0,0.5)',
  success: '#4CAF6A',
  danger: '#E05252',
  amber: '#F0A500',
  // Light mode
  lightBg: '#F5F0E8',
  lightCard: '#FFFFFF',
  lightText: '#1A1A2E',
  lightSubtext: '#666680',
  lightBorder: '#E0D8C8',
};

// ─── Prayer Names ──────────────────────────────────────────────────────────────
export const PRAYERS = [
  { key: 'fajr',    english: 'Fajr',    arabic: 'الفجر',    duration: 20, icon: '🌙' },
  { key: 'dhuhr',   english: 'Dhuhr',   arabic: 'الظهر',    duration: 15, icon: '☀️' },
  { key: 'asr',     english: 'Asr',     arabic: 'العصر',    duration: 15, icon: '🌤' },
  { key: 'maghrib', english: 'Maghrib', arabic: 'المغرب',   duration: 10, icon: '🌇' },
  { key: 'isha',    english: 'Isha',    arabic: 'العشاء',   duration: 20, icon: '⭐' },
];

// ─── Calculation Methods ────────────────────────────────────────────────────────
export const CALC_METHODS = {
  karachi:  { name: 'University of Islamic Sciences, Karachi', apiMethodId: 1, fajrAngle: 18, ishaAngle: 18 },
  isna:     { name: 'ISNA (North America)',                    apiMethodId: 2, fajrAngle: 15, ishaAngle: 15 },
  mwl:      { name: 'Muslim World League',                     apiMethodId: 3, fajrAngle: 18, ishaAngle: 17 },
  egypt:    { name: 'Egyptian General Authority',              apiMethodId: 5, fajrAngle: 19.5, ishaAngle: 17.5 },
  makkah:   { name: 'Umm Al-Qura, Makkah',                    apiMethodId: 4, fajrAngle: 18.5, ishaAngle: 0 },
};

export const LOCATION_MODES = {
  coords:  { label: 'GPS Coordinates', desc: 'Use device location or manual lat/lng' },
  city:    { label: 'City & Country', desc: 'Lookup by city name via Aladhan API' },
  address: { label: 'Full Address', desc: 'Lookup by street address via Aladhan API' },
};

export const MADHABS = {
  hanafi:  { name: 'Hanafi',  shadowRatio: 2 },
  shafii:  { name: "Shafi'i / Maliki / Hanbali", shadowRatio: 1 },
};

// ─── AsyncStorage Keys ──────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  SETTINGS:        '@namazguard/settings',
  PERMISSIONS:     '@permissions/granted',
  LOCK_PREFIX:     '@lock/',
  TASBIH_PREFIX:   '@tasbih/',
  CACHED_TIMES:    '@namazguard/cached_times',
};

// ─── Default Settings ───────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  calcMethod:        'karachi',
  madhab:            'hanafi',
  locationMode:      'city',
  latitude:          24.8607,
  longitude:         67.0011,
  cityName:          'Karachi',
  country:           'Pakistan',
  state:             '',
  address:           'Karachi, Pakistan',
  apiKey:            '',
  notificationLead:  10,
  theme:             'dark',
};

// ─── Mecca coordinates for Qibla ───────────────────────────────────────────────
export const MECCA = { lat: 21.4225, lng: 39.8262 };

// ─── Background task name ───────────────────────────────────────────────────────
export const BACKGROUND_FETCH_TASK = 'NAMAZGUARD_MIDNIGHT_FETCH';
