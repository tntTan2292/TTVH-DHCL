// Unified color system for Quản lý mạng lưới (Network Management)

export const SERVICE_POINT_COLORS = {
  'Giao dịch': '#F59E0B',        // Amber/Gold Star
  'Bưu cục vận hành': '#2563EB', // Blue Truck/Branch
  'Văn hoá xã (VHX)': '#16A34A', // Green Triangle (includes 'VHX')
  'VHX': '#16A34A',              // Green Triangle alias
  'Văn phòng': '#DC2626',        // Red Building
  'Khai thác tỉnh': '#7C3AED',   // Purple Hub
  'Khác / Chưa phân loại': '#6B7280', // Gray Circle fallback
};

export const SERVICE_POINT_FALLBACK_COLOR = '#6B7280';

export function normalizeLoaiDiem(loaiDiem) {
  if (!loaiDiem) return 'Khác / Chưa phân loại';
  const str = String(loaiDiem).trim();
  if (str === 'VHX' || str.includes('Văn hoá xã') || str.includes('Văn hóa xã')) {
    return 'Văn hoá xã (VHX)';
  }
  if (str.includes('Giao dịch')) return 'Giao dịch';
  if (str.includes('Bưu cục vận hành')) return 'Bưu cục vận hành';
  if (str.includes('Văn phòng')) return 'Văn phòng';
  if (str.includes('Khai thác tỉnh')) return 'Khai thác tỉnh';
  return 'Khác / Chưa phân loại';
}

export function normalizeTrangThai(trangThai) {
  if (!trangThai) return 'Chưa xác định';
  const str = String(trangThai).trim();
  if (str === 'Hoạt động') return 'Hoạt động';
  if (str === 'Ngừng hoạt động' || str === 'Tạm dừng') return 'Ngừng hoạt động';
  return 'Chưa xác định';
}

export function colorForServicePointType(loaiDiem) {
  const norm = normalizeLoaiDiem(loaiDiem);
  return SERVICE_POINT_COLORS[norm] || SERVICE_POINT_FALLBACK_COLOR;
}

// 28 Mạng đường thư cấp 2 route color palette with high contrast
export const ROUTE_COLOR_PALETTE = [
  '#2563EB', '#DC2626', '#16A34A', '#D97706', '#7C3AED',
  '#0891B2', '#DB2777', '#65A30D', '#EA580C', '#4F46E5',
  '#0284C7', '#E11D48', '#059669', '#B45309', '#9333EA',
  '#06B6D4', '#F43F5E', '#10B981', '#F59E0B', '#6366F1'
];

export function colorForRouteId(routeId) {
  const index = Math.abs(Number(routeId) || 0) % ROUTE_COLOR_PALETTE.length;
  return ROUTE_COLOR_PALETTE[index];
}

// Delivery Service Type colors
export const DELIVERY_SERVICE_COLORS = {
  'E-EMS(trừ E-Báo phát và E-Hỏa tốc)': '#DC2626',
  'E-EMS': '#DC2626',
  'E-Hỏa tốc': '#7C3AED',
  'E-Báo Phát': '#E11D48',
  'C-Bưu kiện': '#2563EB',
  'KT1': '#059669',
  'KT1 C': '#047857',
  'R-Bưu phẩm bảo đảm': '#D97706',
  'R-Báo Phát': '#B45309',
};

export function colorForDeliveryService(serviceType) {
  if (!serviceType) return '#4B5563';
  for (const [key, color] of Object.entries(DELIVERY_SERVICE_COLORS)) {
    if (serviceType.includes(key)) return color;
  }
  return '#4B5563';
}

export const DELIVERY_LEGEND_ITEMS = [
  { label: 'E-EMS / Bưu gửi EMS', color: DELIVERY_SERVICE_COLORS['E-EMS'] },
  { label: 'E-Hỏa tốc', color: DELIVERY_SERVICE_COLORS['E-Hỏa tốc'] },
  { label: 'E-Báo Phát', color: DELIVERY_SERVICE_COLORS['E-Báo Phát'] },
  { label: 'C-Bưu kiện', color: DELIVERY_SERVICE_COLORS['C-Bưu kiện'] },
  { label: 'KT1 / KT1 C', color: DELIVERY_SERVICE_COLORS['KT1'] },
  { label: 'R-Bưu phẩm bảo đảm', color: DELIVERY_SERVICE_COLORS['R-Bưu phẩm bảo đảm'] },
  { label: 'Dịch vụ khác', color: '#4B5563' },
];

export const DELIVERY_DISCLAIMER_TEXT =
  'Màu điểm chỉ thể hiện nhóm dịch vụ, không phản ánh đạt hoặc không đạt chất lượng.';

// Custom SVG Icons for Service Points matching reference HTML design & status indication
export function createServicePointSvg(loaiDiem, size = 26, trangThai = 'Hoạt động') {
  const normLoai = normalizeLoaiDiem(loaiDiem);
  const normStatus = normalizeTrangThai(trangThai);
  const color = colorForServicePointType(normLoai);

  // Border and stroke properties based on status
  const isInactive = normStatus === 'Ngừng hoạt động';
  const isUnknown = normStatus === 'Chưa xác định';

  const strokeColor = isInactive ? '#1F2937' : isUnknown ? '#D97706' : 'white';
  const strokeWidth = isInactive ? '2.4' : '1.8';
  const strokeDash = isUnknown ? 'stroke-dasharray="3,2"' : '';

  // Inactive badge crossmark overlay (✕)
  const crossmarkSvg = isInactive
    ? `<path d="M5 5 L23 23 M23 5 L5 23" stroke="#DC2626" stroke-width="3.5" stroke-linecap="round" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.6))"/>
       <path d="M5 5 L23 23 M23 5 L5 23" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>`
    : '';

  // Unknown status question badge (?)
  const unknownSvg = isUnknown
    ? `<circle cx="21" cy="7" r="5" fill="#D97706" stroke="white" stroke-width="1"/>
       <text x="21" y="10" font-size="8" font-weight="900" fill="white" text-anchor="middle">?</text>`
    : '';

  let baseShapeSvg = '';
  switch (normLoai) {
    case 'Giao dịch':
      baseShapeSvg = `<polygon points="14,1 17.7,9.1 26.5,10 20,16 21.9,24.8 14,20.3 6.1,24.8 8,16 1.5,10 10.3,9.1" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash} filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.4))"/>`;
      break;
    case 'Bưu cục vận hành':
      baseShapeSvg = `<rect x="2" y="7" width="15" height="12" rx="2" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash} filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.4))"/>
        <path d="M17 11 H22 L26 16 V19 H17 Z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
        <circle cx="8" cy="21" r="3" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
        <circle cx="21" cy="21" r="3" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      break;
    case 'Văn hoá xã (VHX)':
      baseShapeSvg = `<polygon points="14,2 26,25 2,25" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash} filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.4))"/>`;
      break;
    case 'Văn phòng':
      baseShapeSvg = `<path d="M2 13 L14 2 L26 13 L23 13 L23 26 L6 26 L6 13 Z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash} filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.4))"/>
        <rect x="11" y="17" width="6" height="9" fill="white" opacity="0.95"/>`;
      break;
    case 'Khai thác tỉnh':
      baseShapeSvg = `<circle cx="14" cy="14" r="11" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash} filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.4))"/>
        <circle cx="14" cy="14" r="5" fill="white"/>
        <circle cx="14" cy="14" r="2.5" fill="${color}"/>`;
      break;
    default:
      baseShapeSvg = `<circle cx="14" cy="14" r="9" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash}/>`;
      break;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    ${baseShapeSvg}
    ${crossmarkSvg}
    ${unknownSvg}
  </svg>`;
}

export const HUE_MAP_CENTER = [16.46, 107.59];
export const HUE_MAP_DEFAULT_ZOOM = 10;
export const ZOOM_LABEL_THRESHOLD_SERVICE = 13;
export const ZOOM_LABEL_THRESHOLD_DELIVERY = 14;
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';

