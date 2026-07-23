import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';  // side-effect: initializes i18next + react-i18next
import './App.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <Suspense> is required when i18next.loadResources is async; without
  // it the first render of <App> may happen before locale resources
  // are loaded and any <T> children that read i18n would see empty
  // keys. The fallback here is just the unstyled document — by the
  // time React paints anything user-facing, the bundles are loaded.
  <Suspense fallback={null}>
    <App />
  </Suspense>
);
