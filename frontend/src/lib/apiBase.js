const getDefaultOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
};

export const resolveApiBaseUrl = (envValue = '', currentOrigin = getDefaultOrigin()) => {
  if (envValue) return envValue;
  return `${currentOrigin}/api/v1`;
};

export const resolveBackendOrigin = (envValue = '', currentOrigin = getDefaultOrigin()) => {
  const apiBase = resolveApiBaseUrl(envValue, currentOrigin);
  return apiBase.replace(/\/api\/v1$/, '');
};
