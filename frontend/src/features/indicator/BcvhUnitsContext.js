import { createContext, createElement, useContext, useMemo } from 'react';
import { CANONICAL_BCVH_CODES } from '../dashboard/components/dashboardFilterOptions.js';

// F12-DASHBOARD-UI-01 review fix (C1/C2): the shared BCVH screens were written for exactly six canonical
// BCVH. An indicator whose ranked units come from its own metadata (F1.2: ~36 accepting units) mounts this
// provider with the units of `/dashboard/meta`; without a provider every consumer gets the six canonical
// BCVH and the F1.1 / F1.3 / F4.1 screens behave exactly as before.

export const SMALL_MULTIPLES_MAX_UNITS = 6;

// Distinct, readable series colours for more than six units (the six canonical BCVH keep BCVH_COLORS).
const FALLBACK_PALETTE = Object.freeze([
  '#0d9488', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0284c7', '#059669', '#dc2626',
  '#4f46e5', '#ca8a04', '#0891b2', '#9333ea', '#16a34a', '#ea580c', '#be185d', '#475569',
]);

const DEFAULT_UNITS = Object.freeze({
  dynamic: false,
  codes: CANONICAL_BCVH_CODES,
  names: null,
  colors: null,
  totalLabel: 'Tổng cộng 6 BCVH',
  allLabel: 'Tất cả 6 BCVH',
  allowSmallMultiples: true,
});

const BcvhUnitsContext = createContext(null);

export function buildBcvhUnitsValue(units) {
  const list = (Array.isArray(units) ? units : [])
    .map((unit) => ({ ma_bcvh: String(unit?.ma_bcvh ?? ''), ten_bcvh: String(unit?.ten_bcvh ?? '') }))
    .filter((unit) => unit.ma_bcvh !== '');
  const names = {};
  const colors = {};
  list.forEach((unit, index) => {
    names[unit.ma_bcvh] = unit.ten_bcvh || unit.ma_bcvh;
    colors[unit.ma_bcvh] = FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  });
  return {
    dynamic: true,
    codes: list.map((unit) => unit.ma_bcvh),
    names,
    colors,
    totalLabel: 'Tổng cộng',
    allLabel: `Tất cả ${list.length} đơn vị`,
    allowSmallMultiples: list.length <= SMALL_MULTIPLES_MAX_UNITS,
  };
}

export function BcvhUnitsProvider({ units, children }) {
  const value = useMemo(() => (units ? buildBcvhUnitsValue(units) : null), [units]);
  return createElement(BcvhUnitsContext.Provider, { value }, children);
}

export function useBcvhUnits() {
  return useContext(BcvhUnitsContext) || DEFAULT_UNITS;
}
