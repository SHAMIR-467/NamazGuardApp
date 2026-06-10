import { useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS, COLORS } from '../constants/theme';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = isDark ? DARK_COLORS : LIGHT_COLORS;
  return { isDark, palette, COLORS, scheme };
}
