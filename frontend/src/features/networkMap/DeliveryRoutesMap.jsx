import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import {
  HUE_MAP_CENTER,
  HUE_MAP_DEFAULT_ZOOM,
  ZOOM_LABEL_THRESHOLD_DELIVERY,
  colorForDeliveryService,
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
  DELIVERY_LEGEND_ITEMS,
  DELIVERY_DISCLAIMER_TEXT,
} from './mapStyles';
import { fetchDeliveryRoadRoute } from './deliveryRoutingService';

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

export default function DeliveryRoutesMap({ points }) {
  const [currentZoom, setCurrentZoom] = useState(HUE_MAP_DEFAULT_ZOOM);
  const [routeResult, setRouteResult] = useState({ segments: [], hasFallback: false, warning: null });
  const [routingLoading, setRoutingLoading] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  const showLabels = currentZoom >= ZOOM_LABEL_THRESHOLD_DELIVERY;

  // Group parcels by distinct physical location (lat, lon) to prevent overlapping markers
  const groupedLocations = useMemo(() => {
    const map = new Map();
    points.forEach((p, index) => {
      const sequenceNum = index + 1;
      const key = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          lat: p.lat,
          lon: p.lon,
          parcels: [],
          firstSeq: sequenceNum,
          lastSeq: sequenceNum,
        });
      }
      const loc = map.get(key);
      loc.parcels.push({ ...p, sequenceNum });
      loc.lastSeq = sequenceNum;
    });
    return Array.from(map.values());
  }, [points]);

  // Direct straight line positions as initial fallback
  const straightPositions = useMemo(
    () => groupedLocations.map((loc) => [loc.lat, loc.lon]),
    [groupedLocations],
  );

  // Fetch road-network route when groupedLocations change
  useEffect(() => {
    let cancelled = false;
    if (groupedLocations.length < 2) {
      setRouteResult({ segments: [], hasFallback: false, warning: null });
      setRoutingLoading(false);
      return;
    }

    setRoutingLoading(true);
    fetchDeliveryRoadRoute(groupedLocations)
      .then((res) => {
        if (cancelled) return;
        setRouteResult(res);
        setRoutingLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setRouteResult({
          segments: [{ isRoad: false, positions: straightPositions, error: err.message }],
          hasFallback: true,
          warning: '⚠️ Không thể định tuyến OSRM, hiển thị đường nối thẳng dự phòng.',
        });
        setRoutingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupedLocations, straightPositions]);

  const totalPoints = points.length;

  return (
    <div style={{ height: '70vh' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
      <MapContainer
        center={straightPositions[0] || HUE_MAP_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <ZoomTracker onZoomChange={setCurrentZoom} />
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />

        {/* Render Road Network Segments or Fallback Polylines */}
        {routeResult.segments.length > 0 ? (
          routeResult.segments.map((seg, idx) => (
            <Polyline
              key={`segment-${idx}-${seg.isRoad ? 'road' : 'fallback'}`}
              positions={seg.positions}
              pathOptions={
                seg.isRoad
                  ? { color: '#1D4ED8', weight: 4, opacity: 0.9, dashArray: null }
                  : { color: '#F59E0B', weight: 4, opacity: 0.85, dashArray: '8, 8' }
              }
            />
          ))
        ) : straightPositions.length >= 2 ? (
          // Initial or fallback polyline before async route loads
          <Polyline
            positions={straightPositions}
            pathOptions={{ color: '#1D4ED8', weight: 4, opacity: 0.85, dashArray: '6, 6' }}
          />
        ) : null}

        {/* Grouped Location Markers */}
        {groupedLocations.map((loc) => {
          const isStart = loc.firstSeq === 1;
          const isEnd = loc.lastSeq === totalPoints;
          const parcelCount = loc.parcels.length;

          // Determine badge color: Green for START, Red for END, Orange for cluster, Blue/Service for normal
          const primaryService = loc.parcels[0]?.loai_dich_vu;
          const serviceColor = colorForDeliveryService(primaryService);
          const badgeBg = isStart ? '#16A34A' : isEnd ? '#DC2626' : parcelCount > 1 ? '#EA580C' : serviceColor;

          let badgeText = '';
          if (isStart && isEnd) {
            badgeText = `START/END (#1-${totalPoints})`;
          } else if (isStart) {
            badgeText = parcelCount > 1 ? `START (#1-#${loc.lastSeq})` : 'START (#1)';
          } else if (isEnd) {
            badgeText = parcelCount > 1 ? `END (#${loc.firstSeq}-#${loc.lastSeq})` : `END (#${totalPoints})`;
          } else if (parcelCount > 1) {
            badgeText = `#${loc.firstSeq}-#${loc.lastSeq} (${parcelCount} BG)`;
          } else {
            badgeText = `#${loc.firstSeq}`;
          }

          const firstParcel = loc.parcels[0];
          const timeLabel = firstParcel?.raw_thoi_gian_nhap_phat || firstParcel?.thoi_gian_nhap_phat || firstParcel?.status_time || '—';

          const iconHtml = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="
                min-width: 24px;
                height: 24px;
                padding: 0 6px;
                border-radius: 12px;
                background: ${badgeBg};
                color: white;
                font-weight: 800;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                white-space: nowrap;
              ">
                ${badgeText}
              </div>
              ${
                showLabels
                  ? `<div style="
                      position: absolute;
                      left: 100%;
                      margin-left: 4px;
                      top: 1px;
                      white-space: nowrap;
                      background: rgba(255, 255, 255, 0.95);
                      color: #0F172A;
                      border: 1px solid rgba(15, 23, 42, 0.25);
                      border-radius: 4px;
                      padding: 1px 6px;
                      font-size: 10px;
                      font-weight: 700;
                      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
                      pointer-events: none;
                    ">
                      <span style="color: ${serviceColor}; margin-right: 4px;">${firstParcel?.ma_buu_gui}</span>
                      (${timeLabel})
                    </div>`
                  : ''
              }
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-delivery-marker',
            iconSize: [30, 24],
            iconAnchor: [15, 12],
          });

          return (
            <Marker key={loc.key} position={[loc.lat, loc.lon]} icon={customIcon}>
              <Popup maxWidth={320}>
                <div className="text-xs p-1">
                  <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-gray-200">
                    <div>
                      <span className="font-bold text-gray-900 text-xs">Vị trí phát ({parcelCount} bưu gửi)</span>
                      <div className="text-[10px] text-gray-500">{loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white shrink-0" style={{ backgroundColor: badgeBg }}>
                      {badgeText}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {loc.parcels.map((p) => {
                      const displayTime = p.raw_thoi_gian_nhap_phat || p.thoi_gian_nhap_phat || 'Chưa nhập phát';
                      const pColor = colorForDeliveryService(p.loai_dich_vu);
                      return (
                        <div key={p.id || p.ma_buu_gui} className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-gray-700 space-y-0.5">
                          <div className="flex items-center justify-between font-semibold text-gray-900">
                            <span>#{p.sequenceNum}. <span className="text-blue-700 font-bold">{p.ma_buu_gui}</span></span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold text-white" style={{ backgroundColor: pColor }}>
                              {p.loai_dich_vu || 'N/A'}
                            </span>
                          </div>
                          <div><b>Thời gian nhập phát:</b> <span className="font-bold text-blue-800">{displayTime}</span></div>
                          <div className="flex justify-between text-[11px]">
                            <span><b>Ca:</b> {p.ca_phat || 'Chưa xếp ca'}</span>
                            <span><b>COD:</b> <b className="text-emerald-700">{typeof p.tien_thu_ho === 'number' ? p.tien_thu_ho.toLocaleString('vi-VN') : '0'} đ</b></span>
                          </div>
                          <div className="text-[10px] text-gray-500">BCVH: {p.ma_bcvh || '—'} • Bưu tá: {p.postman_code || '—'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Warning Overlay when routing fails for some or all chunks */}
      {routeResult.warning && (
        <div className="absolute top-2 left-12 z-[1000] bg-amber-50/95 border border-amber-300 text-amber-900 rounded-lg px-3 py-1.5 text-xs shadow-md flex items-center gap-1.5 max-w-md">
          <span>{routeResult.warning}</span>
        </div>
      )}

      {/* Zoom Status Overlay */}
      <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg px-2.5 py-1 text-xs text-gray-700 font-medium flex items-center gap-1.5">
        {routingLoading && <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />}
        <span>Zoom: {currentZoom} {showLabels ? '• Hiển thị mã bưu gửi' : '• Zoom ≥ 14 để hiện chi tiết'}</span>
      </div>

      {/* Interactive Collapsible Legend Box Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000]">
        {!isLegendExpanded ? (
          <button
            onClick={() => setIsLegendExpanded(true)}
            className="bg-white/95 backdrop-blur border border-gray-300 shadow-md rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-1.5 transition-all"
            data-testid="delivery-legend-toggle"
          >
            <span>🗺️ CHÚ GIẢI BẢN ĐỒ</span>
            <ChevronUp size={14} className="text-gray-500" />
          </button>
        ) : (
          <div
            className="bg-white/95 backdrop-blur-md border border-gray-300 shadow-xl rounded-xl p-3.5 text-xs text-gray-800 max-w-xs sm:max-w-sm w-full space-y-3 transition-all max-h-[60vh] overflow-y-auto"
            data-testid="delivery-legend-box"
          >
            {/* Header with Collapse Button */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                <span>🗺️ CHÚ GIẢI BẢN ĐỒ</span>
              </div>
              <button
                onClick={() => setIsLegendExpanded(false)}
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded-md hover:bg-gray-100 transition-colors"
                title="Thu gọn chú giải"
                data-testid="delivery-legend-collapse"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* 1. Marker Sequence & Badges */}
            <div>
              <div className="font-semibold text-gray-700 text-[11px] mb-1.5">Ký hiệu điểm & Thứ tự phát:</div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-extrabold text-[10px]">START (#1)</span>
                  <span className="text-gray-600 text-[10px]">Đầu tiên</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px]">END (#N)</span>
                  <span className="text-gray-600 text-[10px]">Cuối cùng</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="px-1.5 py-0.5 rounded bg-orange-600 text-white font-extrabold text-[10px]">#1-#3 (2 BG)</span>
                  <span className="text-gray-600 text-[10px]">Gộp vị trí &gt; 1 bưu gửi</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2 text-gray-700 bg-blue-50/70 p-1.5 rounded-lg border border-blue-100">
                  <span className="font-bold text-blue-900 text-[11px]"># số bên trong marker</span>
                  <span className="text-[10px] text-blue-800">= Thứ tự nhập phát theo thời gian</span>
                </div>
              </div>
            </div>

            {/* 2. Delivery Service Categories */}
            <div>
              <div className="font-semibold text-gray-700 text-[11px] mb-1.5">Nhóm dịch vụ (Màu điểm):</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {DELIVERY_LEGEND_ITEMS.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                    <span className="truncate text-gray-700" title={label}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Route Line Styles */}
            <div>
              <div className="font-semibold text-gray-700 text-[11px] mb-1.5">Đường hành trình:</div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-blue-700 rounded-full shrink-0" />
                  <span><b>Đường xanh liền:</b> Định tuyến thành công theo mạng giao thông OSRM</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0 border-t-2 border-dashed border-amber-500 shrink-0" />
                  <span><b>Đường cam nét đứt:</b> Đoạn định tuyến lỗi, nối thẳng dự phòng</span>
                </div>
              </div>
            </div>

            {/* 4. Mandatory Disclaimer Note */}
            <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-600 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100 flex items-start gap-1">
              <Info size={13} className="text-amber-700 shrink-0 mt-0.5" />
              <span>{DELIVERY_DISCLAIMER_TEXT}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
