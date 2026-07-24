import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

// Two-state pill: EN / VI. Reads the current language so the active
// option is highlighted without us having to track it ourselves —
// i18next.language changes via the `languageChanged` event but
// useTranslation is wired to subscribe to it, so a re-render is
// automatic when we call i18n.changeLanguage().
//
// Disabled while a language switch is in flight so the user can't
// queue several changeLanguage calls in a row (only one matters).

const LANGS = [
  { code: 'vi', label: 'VI' },
  { code: 'en', label: 'EN' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [pending, setPending] = React.useState(null);

  const onPick = async (code) => {
    if (code === i18n.language || pending) return;
    setPending(code);
    try {
      await i18n.changeLanguage(code);
    } catch (err) {
      console.warn('[lang] changeLanguage failed', err);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={`lang-switcher-btn${i18n.language === code ? ' is-active' : ''}`}
          aria-pressed={i18n.language === code}
          disabled={pending !== null}
          onClick={() => onPick(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}