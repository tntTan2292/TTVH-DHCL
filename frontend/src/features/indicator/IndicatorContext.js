import { createContext, createElement, useContext } from 'react';
import { F13_INDICATOR } from './indicatorConfig.js';

// The indicator of the report page being rendered. Default F1.3, so a page without a provider
// behaves as before. The provider only carries a value: it mutates nothing, so a render that
// is discarded (React transition, error boundary) cannot leave anything behind.
const IndicatorContext = createContext(F13_INDICATOR);

export function IndicatorProvider({ indicator = F13_INDICATOR, children }) {
  return createElement(IndicatorContext.Provider, { value: indicator }, children);
}

export function useIndicator() {
  return useContext(IndicatorContext);
}
