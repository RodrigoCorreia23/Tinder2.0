import { create } from 'zustand';
import * as storage from '@/utils/storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  initialize: (systemIsDark: boolean) => Promise<void>;
  updateSystemTheme: (systemIsDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  isDark: false,

  setMode: async (mode) => {
    await storage.setItem('themeMode', mode);
    set({ mode });
  },

  initialize: async (systemIsDark) => {
    const saved = (await storage.getItem('themeMode')) as ThemeMode | null;
    const mode = saved || 'system';
    const isDark = mode === 'dark' || (mode === 'system' && systemIsDark);
    set({ mode, isDark });
  },

  updateSystemTheme: (systemIsDark) => {
    const { mode } = get();
    const isDark = mode === 'dark' || (mode === 'system' && systemIsDark);
    set({ isDark });
  },
}));
