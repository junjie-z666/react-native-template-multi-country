import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { baseTranslations } from "./en";

export function initI18n(
  countryTranslations: Record<string, Record<string, string>>,
  locale: string
) {
  const resources = {
    en: { translation: baseTranslations },
    ...Object.fromEntries(
      Object.entries(countryTranslations).map(([lng, translations]) => [
        lng,
        { translation: { ...baseTranslations, ...translations } },
      ])
    ),
  };

  i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

  return i18n;
}

export { i18n };
