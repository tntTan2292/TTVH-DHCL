const DEFAULT_BACKEND_PORT = '5050';

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

export function resolveApiBaseUrl(runtimeLocation = globalThis.location, runtimeEnv = import.meta.env) {
  const configured = runtimeEnv?.VITE_API_BASE_URL || runtimeEnv?.VITE_API_URL;
  if (configured) {
    return trimTrailingSlash(configured);
  }

  // QIS-HTTPS-LAN-01: a page opened over https must not call the plain-http backend on port 5050 directly
  // (the browser blocks it as mixed content). It calls /api on its own address; the frontend server forwards
  // that to the backend (see vite.config.js).
  if (runtimeLocation?.protocol === 'https:') {
    return '/api';
  }

  const hostname = runtimeLocation?.hostname || 'localhost';

  return `http://${hostname}:${DEFAULT_BACKEND_PORT}/api`;
}

export { DEFAULT_BACKEND_PORT };
