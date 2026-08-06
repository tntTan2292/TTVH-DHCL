import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  normalizeLoaiDiem,
  normalizeTrangThai,
  colorForServicePointType,
  createServicePointSvg,
  createTamDungMarkerSvg,
  HUE_MAP_CENTER,
  HUE_MAP_DEFAULT_ZOOM,
  ZOOM_LABEL_THRESHOLD_SERVICE,
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
} from './mapStyles';

// Map event listener to keep track of current zoom level
function ZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  return null;
}

export default function ServicePointsMap({ points }) {
  const [currentZoom, setCurrentZoom] = useState(HUE_MAP_DEFAULT_ZOOM);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  // NETWORK-MANAGEMENT-001 Phase 3: "Tạm dừng" points are hidden by default
  // (data is always kept/returned by the API — this is a display-only toggle).
  const [showTamDung, setShowTamDung] = useState(false);

  // Reconciled Category Statistics summing to exactly 151
  const categoryStats = useMemo(() => {
    const counts = {
      'Văn hoá xã (VHX)': 0,
      'Giao dịch': 0,
      'Văn phòng': 0,
      'Bưu cục vận hành': 0,
      'Khai thác tỉnh': 0,
      'Khác / Chưa phân loại': 0,
    };
    (points || []).forEach((p) => {
      const normCat = normalizeLoaiDiem(p.loai_diem);
      if (counts[normCat] !== undefined) {
        counts[normCat]++;
      } else {
        counts['Khác / Chưa phân loại']++;
      }
    });
    return counts;
  }, [points]);

  // Reconciled Status Statistics summing to exactly 151
  const statusStats = useMemo(() => {
    const counts = {
      'Hoạt động': 0,
      'Ngừng hoạt động': 0,
      'Chưa xác định': 0,
    };
    (points || []).forEach((p) => {
      const normStatus = normalizeTrangThai(p.trang_thai);
      if (counts[normStatus] !== undefined) {
        counts[normStatus]++;
      } else {
        counts['Chưa xác định']++;
      }
    });
    return counts;
  }, [points]);

  // Filter points based on category selection, status selection, and search query
  const tamDungCount = useMemo(
    () => (points || []).filter((p) => normalizeTrangThai(p.trang_thai) === 'Ngừng hoạt động').length,
    [points],
  );

  const filteredPoints = useMemo(() => {
    return (points || []).filter((p) => {
      const normCat = normalizeLoaiDiem(p.loai_diem);
      const normStatus = normalizeTrangThai(p.trang_thai);

      // Default-hide Tạm dừng points unless the legend toggle is on, or the
      // admin explicitly filtered to that status.
      if (normStatus === 'Ngừng hoạt động' && !showTamDung && selectedStatus !== 'Ngừng hoạt động') return false;

      if (selectedCategory && normCat !== selectedCategory) return false;
      if (selectedStatus && normStatus !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (p.ma_diem || '').toLowerCase().includes(q);
        const matchName = (p.ten_diem || '').toLowerCase().includes(q);
        const matchAddr = (p.dia_chi || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchAddr) return false;
      }
      return true;
    });
  }, [points, selectedCategory, selectedStatus, searchQuery, showTamDung]);

  const showLabels = currentZoom >= ZOOM_LABEL_THRESHOLD_SERVICE;

  // Category legend definitions matching exact SVG marker renderer
  const categoryLegendList = [
    { label: 'Văn hoá xã (VHX)', catKey: 'Văn hoá xã (VHX)' },
    { label: 'Giao dịch', catKey: 'Giao dịch' },
    { label: 'Văn phòng', catKey: 'Văn phòng' },
    { label: 'Bưu cục vận hành', catKey: 'Bưu cục vận hành' },
    { label: 'Khai thác tỉnh', catKey: 'Khai thác tỉnh' },
    { label: 'Khác / Chưa phân loại', catKey: 'Khác / Chưa phân loại' },
  ];

  const statusLegendList = [
    { label: 'Hoạt động', statusKey: 'Hoạt động' },
    { label: 'Ngừng hoạt động', statusKey: 'Ngừng hoạt động' },
    { label: 'Chưa xác định', statusKey: 'Chưa xác định' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
      <div style={{ height: '72vh' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
        <MapContainer center={HUE_MAP_CENTER} zoom={HUE_MAP_DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <ZoomTracker onZoomChange={setCurrentZoom} />
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />
          {filteredPoints.map((point) => {
            const normCat = normalizeLoaiDiem(point.loai_diem);
            const normStatus = normalizeTrangThai(point.trang_thai);
            // "Tạm dừng" always gets the dedicated grey marker — never one of
            // the 5 active loai_diem colors, so it can never be confused
            // with an active point of any category.
            const svgString = normStatus === 'Ngừng hoạt động'
              ? createTamDungMarkerSvg(26)
              : createServicePointSvg(point.loai_diem, 26, point.trang_thai);

            const displayLabel = point.ten_diem ? `${point.ma_diem} - ${point.ten_diem}` : `${point.ma_diem}`;

            const iconHtml = `
              <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                <div style="line-height: 0;">${svgString}</div>
                ${
                  showLabels
                    ? `<div style="
                        position: absolute;
                        left: 28px;
                        top: 2px;
                        white-space: nowrap;
                        background: rgba(255, 255, 255, 0.95);
                        color: #0F172A;
                        border: 1px solid rgba(15, 23, 42, 0.25);
                        border-radius: 4px;
                        padding: 1px 6px;
                        font-size: 10px;
                        font-weight: 700;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
                        pointer-events: none;
                      ">${displayLabel}</div>`
                    : ''
                }
              </div>
            `;

            const customIcon = L.divIcon({
              html: iconHtml,
              className: 'custom-service-point-marker',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });

            return (
              <Marker key={point.ma_diem} position={[point.lat, point.lon]} icon={customIcon}>
                <Popup>
                  <div className="text-xs p-1 min-w-[210px]">
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-gray-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: colorForServicePointType(normCat) }}
                      />
                      <span className="font-bold text-gray-900 text-sm">{point.ma_diem}</span>
                    </div>
                    <div className="font-semibold text-gray-800 mb-1">{point.ten_diem}</div>
                    <div className="text-gray-600 space-y-0.5">
                      <div><b>Loại điểm:</b> {point.loai_diem || '—'} ({normCat})</div>
                      <div><b>Địa chỉ:</b> {point.dia_chi || '—'}</div>
                      <div><b>Phường/Xã:</b> {point.phuong_xa || '—'}</div>
                      <div><b>Đơn vị quản lý:</b> {point.don_vi_quan_ly || '—'}</div>
                      <div>
                        <b>Trạng thái:</b>{' '}
                        {normStatus === 'Hoạt động' && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-800 font-bold">
                            Hoạt động
                          </span>
                        )}
                        {normStatus === 'Ngừng hoạt động' && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-bold border border-red-300">
                            ✕ Ngừng hoạt động
                          </span>
                        )}
                        {normStatus === 'Chưa xác định' && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-300">
                            ? Chưa xác định ({point.trang_thai || 'Chưa ghi'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        {/* Zoom & Filter Status Overlay */}
        <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg px-2.5 py-1 text-xs text-gray-700 font-medium">
          Zoom: {currentZoom} {showLabels ? '• Hiển thị: Mã bưu cục - Tên điểm' : '• Zoom ≥ 13 để hiện Mã - Tên'}
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm flex flex-col gap-3 shadow-sm overflow-y-auto max-h-[72vh]">
        <div>
          <div className="font-bold text-gray-900 mb-1">Bộ lọc & Tìm kiếm</div>
          <input
            type="text"
            placeholder="Tìm theo mã, tên, địa chỉ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Tạm dừng visibility toggle — hidden by default (NETWORK-MANAGEMENT-001 Phase 3) */}
        <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs cursor-pointer select-none">
          <span className="flex items-center gap-1.5">
            <span dangerouslySetInnerHTML={{ __html: createTamDungMarkerSvg(16) }} className="shrink-0 leading-none" />
            <span className="font-medium text-gray-700">Hiện điểm Tạm dừng ({tamDungCount})</span>
          </span>
          <input
            type="checkbox"
            checked={showTamDung}
            onChange={(e) => setShowTamDung(e.target.checked)}
            className="h-3.5 w-3.5 accent-gray-500"
          />
        </label>

        {/* Legend 1: Loại điểm */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-800 text-xs">Loại điểm (Tổng: {Object.values(categoryStats).reduce((a, b) => a + b, 0)}/{points.length})</span>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-[10px] text-blue-600 hover:underline font-semibold"
              >
                Xóa lọc
              </button>
            )}
          </div>
          <div className="space-y-1">
            {categoryLegendList.map(({ label, catKey }) => {
              const count = categoryStats[catKey] || 0;
              const isSelected = selectedCategory === catKey;
              const iconSvg = createServicePointSvg(catKey, 18, 'Hoạt động');

              return (
                <button
                  type="button"
                  key={catKey}
                  onClick={() => setSelectedCategory(isSelected ? null : catKey)}
                  className={`w-full flex items-center justify-between p-1.5 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/80 shadow-xs font-semibold'
                      : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span dangerouslySetInnerHTML={{ __html: iconSvg }} className="shrink-0 leading-none" />
                    <span className="truncate text-[11px]">{label}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend 2: Trạng thái hoạt động (Sum = 151) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-800 text-xs">Trạng thái (Tổng: {Object.values(statusStats).reduce((a, b) => a + b, 0)}/{points.length})</span>
            {selectedStatus && (
              <button
                type="button"
                onClick={() => setSelectedStatus(null)}
                className="text-[10px] text-blue-600 hover:underline font-semibold"
              >
                Xóa lọc
              </button>
            )}
          </div>
          <div className="space-y-1">
            {statusLegendList.map(({ label, statusKey }) => {
              const count = statusStats[statusKey] || 0;
              const isSelected = selectedStatus === statusKey;
              const iconSvg = createServicePointSvg('Giao dịch', 18, statusKey);

              return (
                <button
                  type="button"
                  key={statusKey}
                  onClick={() => setSelectedStatus(isSelected ? null : statusKey)}
                  className={`w-full flex items-center justify-between p-1.5 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/80 shadow-xs font-semibold'
                      : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span dangerouslySetInnerHTML={{ __html: iconSvg }} className="shrink-0 leading-none" />
                    <span className="truncate text-[11px]">{label}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-2 border-t border-gray-100 text-[10px] text-gray-500 leading-tight">
          • Marker icon đồng bộ 100% với Chú giải.<br />
          • Zoom ≥ 13 hiển thị nhãn `Mã bưu cục - Tên điểm`.
        </div>
      </div>
    </div>
  );
}


