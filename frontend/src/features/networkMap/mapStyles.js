// Colors reproduced from the reference HTML's own legend
// (Ban_do_mang_diem_phuc_vu_BDTP_Hue.html) — not invented.
export const SERVICE_POINT_COLORS = {
  'Giao dịch': '#F59E0B',
  'Bưu cục vận hành': '#2563EB',
  'Văn hoá xã (VHX)': '#16A34A',
  'Văn phòng': '#DC2626',
  'Khai thác tỉnh': '#7C3AED',
};
export const SERVICE_POINT_FALLBACK_COLOR = '#6B7280';

export function colorForServicePointType(loaiDiem) {
  return SERVICE_POINT_COLORS[loaiDiem] || SERVICE_POINT_FALLBACK_COLOR;
}

// Cycling palette for Mạng đường thư cấp 2 routes (28 routes).
const ROUTE_COLOR_PALETTE = [
  '#2563EB', '#DC2626', '#16A34A', '#F59E0B', '#7C3AED',
  '#0891B2', '#DB2777', '#65A30D', '#EA580C', '#4F46E5',
];

export function colorForRouteId(routeId) {
  const index = Math.abs(Number(routeId) || 0) % ROUTE_COLOR_PALETTE.length;
  return ROUTE_COLOR_PALETTE[index];
}

export const HUE_MAP_CENTER = [16.46, 107.59];
export const HUE_MAP_DEFAULT_ZOOM = 10;
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';
