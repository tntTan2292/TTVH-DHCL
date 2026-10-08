import baseApi from '../../api/client.js';
import { useIndicator } from './IndicatorContext.js';
import { F13_INDICATOR, rewriteIndicatorUrl } from './indicatorConfig.js';

const METHODS_WITH_URL_FIRST = ['get', 'delete', 'head', 'options', 'post', 'put', 'patch'];
const cache = new Map();

// API client scoped to one indicator. For F1.3 it is the shared client itself (same object, no
// wrapper, so F1.3 requests and mocks are untouched). For another indicator each call rewrites
// the shared F1.3 report URLs to that indicator's endpoints. Wrappers are immutable and cached
// per indicator id, so the returned object is stable across renders.
export function createIndicatorApi(indicator, client = baseApi) {
  if (!indicator || indicator.id === F13_INDICATOR.id) return client;
  const scoped = {};
  METHODS_WITH_URL_FIRST.forEach((method) => {
    scoped[method] = (url, ...rest) => client[method](rewriteIndicatorUrl(url, indicator), ...rest);
  });
  scoped.request = (config) => client.request({ ...config, url: rewriteIndicatorUrl(config?.url, indicator) });
  return Object.freeze(scoped);
}

export function getIndicatorApi(indicator) {
  if (!indicator || indicator.id === F13_INDICATOR.id) return baseApi;
  if (!cache.has(indicator.id)) cache.set(indicator.id, createIndicatorApi(indicator));
  return cache.get(indicator.id);
}

export function useIndicatorApi() {
  return getIndicatorApi(useIndicator());
}
