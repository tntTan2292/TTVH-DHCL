// F41-DASHBOARD-RANKING-01 (T3) - which quality indicator (F1.3 or F4.1) the screen on
// display belongs to.
//
// Pure module with no imports, so low-level helpers (the heatmap band catalog, API
// fetchers, recharts render callbacks that cannot receive props or use hooks) can read the
// active indicator without a circular dependency. Only one report page is mounted at a time,
// and `IndicatorProvider` sets this synchronously while rendering, before its children
// render, then clears it on unmount. When nothing is set every consumer falls back to the
// F1.3 defaults, which keeps F1.3 pages and their existing tests behaving exactly as before.

let activeIndicator = null;

export function getActiveIndicator() {
  return activeIndicator;
}

export function setActiveIndicator(indicator) {
  activeIndicator = indicator || null;
}

// Clears the active indicator only when it is still `expected`. A provider that is being
// unmounted while a newer provider has already taken over must not wipe the newer one.
export function clearActiveIndicator(expected) {
  if (activeIndicator === expected) activeIndicator = null;
}
