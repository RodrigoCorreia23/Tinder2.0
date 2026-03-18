import { create } from 'zustand';
import * as storage from '@/utils/storage';

type Language = 'en' | 'pt';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',

  setLanguage: async (language) => {
    await storage.setItem('language', language);
    set({ language });
  },

  initialize: async () => {
    const saved = (await storage.getItem('language')) as Language | null;
    if (saved) set({ language: saved });
  },
}));
