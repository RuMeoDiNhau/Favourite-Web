// i18n bootstrap. Keep this file narrow so the rest of the app can
// import `useTranslation` from react-i18next without owning the
// configuration.
//
// - Two locales are shipped: Vietnamese (default, the project's home
//   audience) and English. New locales can be added by dropping another
//   JSON file into this folder and registering it in the `resources`
//   block below — no consumer code needs to change.
// - `lng` lookup order: localStorage → navigator → 'vi'. The chosen
//   language is persisted so reloads don't bounce users back to the
//   previous tongue.
// - `fallbackLng: 'vi'` keeps the app readable in English even when a
//   key hasn't been translated yet: missing keys fall through to their
//   Vietnamese form instead of showing the raw key path.
// - `ns` is flat-by-area (home, music, knowledge, games, ...) so a
//   key like `music.empty.text` can be located at a glance during
//   review.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import vi from './vi.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    fallbackLng: 'vi',
    supportedLngs: ['en', 'vi'],
    debug: false,
    // We use 'msg:<hash>' as keys (see T.jsx). The default i18next
    // nsSeparator is ':', which would split 'msg:<hash>' into
    // namespace='msg' + key='<hash>' and the lookup would miss
    // every time. Disabling the separator makes the whole string
    // the lookup key — exactly what we want.
    nsSeparator: false,
    interpolation: {
      // React already escapes interpolated values — turning this off
      // avoids double-escaping things like {title} inside a JSX
      // expression.
      escapeValue: false,
    },
    detection: {
      // localStorage key so reloads remember the user's choice. The
      // cookie fallback is left in (Some users have localStorage
      // disabled); navigator is the last fallback.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'fav_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
