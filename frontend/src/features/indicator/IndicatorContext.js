import { createContext, createElement, useContext, useEffect } from 'react';
import { clearActiveIndicator, setActiveIndicator } from './activeIndicator.js';
import { F13_INDICATOR } from './indicatorConfig.js';

const IndicatorContext = createContext(F13_INDICATOR);

// Wraps a report page with its indicator. The active indicator is set while rendering (before
// the children render) so non-React helpers and recharts callbacks see the right thresholds
// and API prefix from the first paint; setting it is idempotent, so StrictMode double
// rendering is harmless. It is cleared on unmount only if still ours.
export function IndicatorProvider({ indicator = F13_INDICATOR, children }) {
  setActiveIndicator(indicator);
  useEffect(() => {
    setActiveIndicator(indicator);
    return () => clearActiveIndicator(indicator);
  }, [indicator]);
  return createElement(IndicatorContext.Provider, { value: indicator }, children);
}

export function useIndicator() {
  return useContext(IndicatorContext);
}
