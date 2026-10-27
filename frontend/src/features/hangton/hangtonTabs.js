// HANGTON-INVENTORY-01: the four screens, one URL each (/hangton/<id>).
export const HANGTON_TAB_IDS = Object.freeze(['overview', 'office', 'compare', 'items', 'handling']);
export const HANGTON_DEFAULT_TAB = 'overview';

export function isHangtonTab(tab) {
  return HANGTON_TAB_IDS.includes(tab);
}

// Unknown or missing tab -> the default screen (the page also rewrites the URL to it).
export function resolveHangtonTab(tab) {
  return isHangtonTab(tab) ? tab : HANGTON_DEFAULT_TAB;
}
