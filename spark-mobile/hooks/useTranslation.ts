import { useLanguageStore } from '@/store/languageStore';
import { translations } from '@/utils/i18n';

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return { t, language };
}
