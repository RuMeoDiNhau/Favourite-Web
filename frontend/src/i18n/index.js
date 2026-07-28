// i18n bootstrap. Two locales are shipped: Vietnamese (default,
// project home audience) and English. New locales can be added by
// dropping another dictionary file into ./dictionaries and registering
// it in the `resources` block below — no consumer code needs to change.
//
// The content lives in ./dictionaries/{vi,en}.js as nested objects
// that mirror each other. Translation keys are dotted paths like
// `home.streak` — read with `t('home.streak', { n: 5 })`. The plain
// `t(key)` form (without a defaultValue) is the convention; we type
// the dictionary elsewhere so a missing key is a build-time error.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import vi from './dictionaries/vi';
import en from './dictionaries/en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en'],
    debug: false,
    // Force synchronous initialization so the app renders immediately.
    // Without this, i18next may resolve asynchronously and React renders
    // before translations are ready.
    initImmediate: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'fav_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;