import { useThemeStore } from '@/store/themeStore';
import { COLORS, DARK_COLORS } from '@/utils/constants';

export function useColors() {
  const isDark = useThemeStore((s) => s.isDark);
  return isDark ? DARK_COLORS : COLORS;
}
