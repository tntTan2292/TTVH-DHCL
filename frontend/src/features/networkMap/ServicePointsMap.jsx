import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  SERVICE_POINT_COLORS,
  colorForServicePointType,
  createServicePointSvg,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate statistics by category
  const categoryStats = useMemo(() => {
    const counts = {
      'Giao dịch': 0,
      'Bưu cục vận hành': 0,
      'Văn hoá xã (VHX)': 0,
      'Văn phòng': 0,
      'Khai thác tỉnh': 0,
    };
    (points || []).forEach((p) => {
      if (counts[p.loai_diem] !== undefined) {
        counts[p.loai_diem]++;
      }
    });
    return counts;
  }, [points]);

  // Filter points based on category selection and search query
  const filteredPoints = useMemo(() => {
    return (points || []).filter((p) => {
      if (selectedCategory && p.loai_diem !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (p.ma_diem || '').toLowerCase().includes(q);
        const matchName = (p.ten_diem || '').toLowerCase().includes(q);
        const matchAddr = (p.dia_chi || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchAddr) return false;
      }
      return true;
    });
  }, [points, selectedCategory, searchQuery]);

  const showLabels = currentZoom >= ZOOM_LABEL_THRESHOLD_SERVICE;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
      <div style={{ height: '72vh' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
        <MapContainer center={HUE_MAP_CENTER} zoom={HUE_MAP_DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <ZoomTracker onZoomChange={setCurrentZoom} />
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />
          {filteredPoints.map((point) => {
            const svgString = createServicePointSvg(point.loai_diem, 26);
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
                        background: rgba(255, 255, 255, 0.92);
                        color: #0F172A;
                        border: 1px solid rgba(15, 23, 42, 0.25);
                        border-radius: 4px;
                        padding: 1px 5px;
                        font-size: 10px;
                        font-weight: 700;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.25);
                        pointer-events: none;
                      ">${point.ma_diem}</div>`
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
                  <div className="text-xs p-1 min-w-[200px]">
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-gray-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: colorForServicePointType(point.loai_diem) }}
                      />
                      <span className="font-bold text-gray-900 text-sm">{point.ma_diem}</span>
                    </div>
                    <div className="font-semibold text-gray-800 mb-1">{point.ten_diem}</div>
                    <div className="text-gray-600 space-y-0.5">
                      <div><b>Loại điểm:</b> {point.loai_diem || '—'}</div>
                      <div><b>Địa chỉ:</b> {point.dia_chi || '—'}</div>
                      <div><b>Phường/Xã:</b> {point.phuong_xa || '—'}</div>
                      <div><b>Đơn vị quản lý:</b> {point.don_vi_quan_ly || '—'}</div>
                      <div>
                        <b>Trạng thái:</b>{' '}
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-800 font-medium">
                          {point.trang_thai || 'Hoạt động'}
                        </span>
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
          Zoom: {currentZoom} {showLabels ? '• Hiển thị mã bưu cục' : '• Zoom ≥ 13 để hiện mã'}
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 text-sm flex flex-col gap-3 shadow-sm">
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800 text-xs">Chú giải loại điểm ({filteredPoints.length}/151)</span>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Xóa lọc
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {Object.entries(SERVICE_POINT_COLORS).map(([label, color]) => {
              const isSelected = selectedCategory === label;
              const count = categoryStats[label] || 0;
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => setSelectedCategory(isSelected ? null : label)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/80 shadow-sm font-semibold'
                      : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-sm inline-block shrink-0 border border-white shadow-xs"
                      style={{ backgroundColor: color }}
                    />
                    <span>{label}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
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

        <div className="mt-auto pt-2 border-t border-gray-100 text-[11px] text-gray-500 leading-tight">
          • Phân cấp Node: Star (Giao dịch), Xe tải (BCVH), Tam giác (VHX), Tòa nhà (Văn phòng), Circle Hub (KT Tỉnh).
        </div>
      </div>
    </div>
  );
}

