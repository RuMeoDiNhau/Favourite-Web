// <T> — translation wrapper with original-text fallback.
//
// Strategy: every JSX hardcoded string is wrapped in <T>...</T>. The
// component looks up `t(msg:<source>)` in the active locale resources.
//   - If a translation exists for the key, render the translated text.
//   - If not, render the original string verbatim. This means the app
//     works without ANY keys present (Vietnamese users see Vietnamese
//     exactly as before) and we add translations incrementally without
//     shipping a broken UI in the meantime.
//
// Why a hash on the source instead of a position-based key: the
// number of strings is too high to maintain a hand-numbered key per
// occurrence, and a hash is stable as long as the source doesn't
// change. We deliberately use a non-cryptographic hash and slice to
// 10 hex chars to keep the keys short.
//
// The component also accepts interpolation: <T>{'Hello, {name}'}</T>
// (rare — most pages concatenate outside the boundary).

import React from 'react';
import { useTranslation } from 'react-i18next';

function hashText(s) {
  // FNV-1a (32-bit) — small and stable. Not for security, just for
  // producing a short stable identifier per source text. We avoid
  // crypto.subtle here because the keys live in JSON shipped to the
  // browser, so the hash only has to be unique-ish, not secret.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Convert to unsigned and pad with zeros so the key length doesn't
  // drift as new strings get added.
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function msgKey(text) {
  return `msg:${hashText(text)}`;
}

export default function T({ children, ns, ...rest }) {
  // children may be a string OR an array of strings/JSX. We only
  // attempt translation when it's a plain string — anything more
  // complex falls through to the original render.
  const text = typeof children === 'string' ? children : null;
  const { t } = useTranslation(ns);
  if (!text) return children;
  const translated = t(msgKey(text), { defaultValue: text });
  // The translation result may itself be an interpolation object when
  // React-i18next can't resolve a key — guard against that.
  if (typeof translated !== 'string') return children;
  return translated;
}
