const DEFAULT_BACKEND_PORT = '5050';

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

export function resolveApiBaseUrl(runtimeLocation = globalThis.location, runtimeEnv = import.meta.env) {
  const configured = runtimeEnv?.VITE_API_BASE_URL || runtimeEnv?.VITE_API_URL;
  if (configured) {
    return trimTrailingSlash(configured);
  }

  const hostname = runtimeLocation?.hostname || 'localhost';
  const protocol = runtimeLocation?.protocol === 'https:' ? 'https:' : 'http:';

  return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}/api`;
}

export { DEFAULT_BACKEND_PORT };
