export const COLORS = {
  // Primary palette
  navy:         '#0D1B2A',
  navyLight:    '#1A2F45',
  navyMid:      '#152236',
  gold:         '#C9A84C',
  goldLight:    '#E8C97A',
  goldDark:     '#A0822A',
  cream:        '#F5ECD7',
  creamDark:    '#E8D5B5',

  // Semantic
  success:      '#2ECC71',
  danger:       '#E74C3C',
  warning:      '#F39C12',
  muted:        '#8899AA',
  mutedLight:   '#AABBCC',
  white:        '#FFFFFF',
  black:        '#000000',
  overlay:      'rgba(0,0,0,0.85)',
  overlayLight: 'rgba(13,27,42,0.92)',

  // Prayer colors
  fajr:         '#4A90D9',
  dhuhr:        '#F5A623',
  asr:          '#7ED321',
  maghrib:      '#E86A6A',
  isha:         '#9B59B6',
};

// Light mode overrides
export const LIGHT_COLORS = {
  background:   '#F0EAD6',
  surface:      '#FDFAF4',
  surfaceAlt:   '#EDE5CE',
  text:         '#1A1A2E',
  textSecondary:'#4A4A6A',
  border:       '#D4C9A8',
};

export const DARK_COLORS = {
  background:   COLORS.navy,
  surface:      COLORS.navyMid,
  surfaceAlt:   COLORS.navyLight,
  text:         COLORS.cream,
  textSecondary:COLORS.mutedLight,
  border:       'rgba(201,168,76,0.25)',
};

export const FONTS = {
  // React Native uses system fonts for Arabic — best cross-platform approach
  arabic:  { fontFamily: undefined, fontWeight: '400' }, // system Arabic
  display: { fontSize: 28, fontWeight: '600', letterSpacing: 0.5 },
  title:   { fontSize: 20, fontWeight: '600' },
  heading: { fontSize: 17, fontWeight: '600' },
  body:    { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
  small:   { fontSize: 11, fontWeight: '400' },
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gold: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
