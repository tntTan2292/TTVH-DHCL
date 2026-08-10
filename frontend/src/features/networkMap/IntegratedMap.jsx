import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  normalizeLoaiDiem,
  normalizeTrangThai,
  colorForServicePointType,
  createServicePointSvg,
  createTamDungMarkerSvg,
  colorForRouteId,
  colorForJourneyDirection,
  createDirectionArrowSvg,
  createJourneyStopSvg,
  HUE_MAP_CENTER,
  HUE_MAP_DEFAULT_ZOOM,
  ZOOM_LABEL_THRESHOLD_SERVICE,
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
} from './mapStyles';
import { fetchRoadRoute } from './roadRoutingService';
import {
  classifyStopDirections,
  groupStopIndicesByCoordinate,
  fanAngles,
  fanAngleToOffset,
  offsetPixelPolyline,
  pickArrowSamplePositions,
  computePolylineLengthKm,
  computeArrowCount,
} from './routeJourneyGeometry';

/**
 * IntegratedMap — NETWORK-MANAGEMENT-002.
 *
 * Renders Mạng điểm phục vụ and Mạng đường thư cấp 2 together on ONE shared
 * <MapContainer>, as two independently toggleable layers. Read-only: no
 * Import/Export/History/Rollback here, and no data is copied or transformed
 * — `points`/`routes` are the exact same shapes `ServicePointsMap.jsx` and
 * `Level2RoutesMap.jsx` already receive from `networkMapClient`.
 *
 * Deliberately does NOT import from or modify `ServicePointsMap.jsx` /
 * `Level2RoutesMap.jsx` (PO-locked: those two files and their approved
 * behavior stay untouched). The marker/popup/legend rendering for Điểm phục
 * vụ and the road-routing/journey-visual rendering for ĐTC2 (including
 * `SelectedRouteJourneyLayer`) are re-implemented here to match those two
 * screens' already-PO-approved output, built on the same shared pure
 * modules (`mapStyles.js`, `roadRoutingService.js`, `routeJourneyGeometry.js`)
 * those two screens already use — this is a second, independent rendering
 * of the same approved visuals, not a refactor of the originals.
 */

const DIRECTION_LABEL = { outbound: 'Chiều đi', return: 'Chiều về', turnaround: 'Quay đầu' };
const MODES = [
  { value: 'all', label: 'Toàn hành trình' },
  { value: 'outbound', label: 'Chiều đi' },
  { value: 'return', label: 'Chiều về' },
];
const FAN_RADIUS_PX = 16;
const LINE_OFFSET_PX = 3;
const ARROW_ICON_SIZE_PX = 26;
const ARROW_SIDE_OFFSET_PX = 13;

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

/** ĐTC2 selected-route journey visual — outbound/return split, turnaround, spiderfy, direction arrows. */
function SelectedRouteJourneyLayer({
  route,
  mode,
  geometry,
  hoveredStopKey,
  setHoveredStopKey,
  hoveredDirection,
  setHoveredDirection,
}) {
  const map = useMap();
  const [epoch, setEpoch] = useState(0);
  useMapEvents({
    zoomend: () => setEpoch((e) => e + 1),
    moveend: () => setEpoch((e) => e + 1),
  });

  const geoStops = useMemo(
    () => (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number'),
    [route.stops],
  );

  const { turnaroundIndex, directions } = useMemo(() => classifyStopDirections(geoStops), [geoStops]);
  const groupedByCoordinate = useMemo(() => groupStopIndicesByCoordinate(geoStops), [geoStops]);

  void epoch;

  const project = (lat, lon) => map.latLngToLayerPoint([lat, lon]);
  const unproject = (point) => map.layerPointToLatLng(point);

  const placeDirectionArrows = (positions, direction, keyPrefix) => {
    const lengthKm = computePolylineLengthKm(positions);
    const count = computeArrowCount(lengthKm);
    return pickArrowSamplePositions(positions, count).map((a, aIdx) => {
      const basePoint = project(a.position[0], a.position[1]);
      const { x, y } = fanAngleToOffset(a.bearing + 90, ARROW_SIDE_OFFSET_PX);
      const offsetLatLng = unproject({ x: basePoint.x + x, y: basePoint.y + y });
      const icon = L.divIcon({
        html: createDirectionArrowSvg(a.bearing, colorForJourneyDirection(direction), ARROW_ICON_SIZE_PX),
        className: 'journey-direction-arrow',
        iconSize: [ARROW_ICON_SIZE_PX, ARROW_ICON_SIZE_PX],
        iconAnchor: [ARROW_ICON_SIZE_PX / 2, ARROW_ICON_SIZE_PX / 2],
      });
      return (
        <Marker
          key={`${keyPrefix}-${aIdx}`}
          position={[offsetLatLng.lat, offsetLatLng.lng]}
          icon={icon}
          interactive={false}
        />
      );
    });
  };

  const showOutbound = mode === 'all' || mode === 'outbound';
  const showReturn = mode === 'all' || mode === 'return';
  const bothShown = mode === 'all' && turnaroundIndex !== null;

  const polylineElements = [];
  if (showOutbound && geometry?.outbound?.segments?.length) {
    geometry.outbound.segments.forEach((seg, segIdx) => {
      let positions = seg.positions;
      if (bothShown) {
        const pixelPts = positions.map(([lat, lon]) => project(lat, lon));
        const offsetPts = offsetPixelPolyline(pixelPts, -LINE_OFFSET_PX);
        positions = offsetPts.map((p) => {
          const ll = unproject(p);
          return [ll.lat, ll.lng];
        });
      }
      polylineElements.push(
        <Polyline
          key={`outbound-${segIdx}`}
          positions={positions}
          pathOptions={
            seg.isRoad
              ? { color: colorForJourneyDirection('outbound'), weight: 5, opacity: 0.95 }
              : { color: '#F59E0B', weight: 5, opacity: 0.9, dashArray: '8, 8' }
          }
          eventHandlers={{
            mouseover: () => setHoveredDirection('outbound'),
            mouseout: () => setHoveredDirection(null),
          }}
        >
          <Tooltip sticky>Chiều đi{!seg.isRoad ? ' — ⚠️ chưa dựng được đường giao thông thực tế' : ''}</Tooltip>
        </Polyline>,
      );
      if (seg.isRoad) {
        placeDirectionArrows(positions, 'outbound', `outbound-arrow-${segIdx}`).forEach((el) => polylineElements.push(el));
      }
    });
  }
  if (showReturn && geometry?.return?.segments?.length) {
    geometry.return.segments.forEach((seg, segIdx) => {
      let positions = seg.positions;
      if (bothShown) {
        const pixelPts = positions.map(([lat, lon]) => project(lat, lon));
        const offsetPts = offsetPixelPolyline(pixelPts, LINE_OFFSET_PX);
        positions = offsetPts.map((p) => {
          const ll = unproject(p);
          return [ll.lat, ll.lng];
        });
      }
      polylineElements.push(
        <Polyline
          key={`return-${segIdx}`}
          positions={positions}
          pathOptions={
            seg.isRoad
              ? { color: colorForJourneyDirection('return'), weight: 5, opacity: 0.95 }
              : { color: '#F59E0B', weight: 5, opacity: 0.9, dashArray: '8, 8' }
          }
          eventHandlers={{
            mouseover: () => setHoveredDirection('return'),
            mouseout: () => setHoveredDirection(null),
          }}
        >
          <Tooltip sticky>Chiều về{!seg.isRoad ? ' — ⚠️ chưa dựng được đường giao thông thực tế' : ''}</Tooltip>
        </Polyline>,
      );
      if (seg.isRoad) {
        placeDirectionArrows(positions, 'return', `return-arrow-${segIdx}`).forEach((el) => polylineElements.push(el));
      }
    });
  }

  const markerElements = [];
  groupedByCoordinate.forEach((indices, coordKey) => {
    const fanned = indices.length > 1;
    const angles = fanAngles(indices.length);
    const [lat0, lon0] = coordKey.split(',').map(Number);

    indices.forEach((idx, fanPos) => {
      const direction = directions[idx];
      if (mode === 'outbound' && direction === 'return') return;
      if (mode === 'return' && direction === 'outbound') return;

      const stop = geoStops[idx];
      const stopNum = idx + 1;
      const stopKey = `${route.id}:${idx}`;
      const isHovered = hoveredStopKey === stopKey || hoveredDirection === direction;

      let markerLatLng = [stop.lat, stop.lon];
      if (fanned) {
        const { x, y } = fanAngleToOffset(angles[fanPos], FAN_RADIUS_PX);
        const basePoint = project(lat0, lon0);
        const offsetPoint = { x: basePoint.x + x, y: basePoint.y + y };
        const ll = unproject(offsetPoint);
        markerLatLng = [ll.lat, ll.lng];
      }

      const icon = L.divIcon({
        html: createJourneyStopSvg(stopNum, direction, { isFanned: fanned || isHovered, size: isHovered ? 30 : 24 }),
        className: 'journey-stop-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const visitsHere = indices.map((visitIdx) => ({
        idx: visitIdx,
        stop: geoStops[visitIdx],
        direction: directions[visitIdx],
      }));

      markerElements.push(
        <Marker
          key={`stop-${idx}`}
          position={markerLatLng}
          icon={icon}
          eventHandlers={{
            mouseover: () => setHoveredStopKey(stopKey),
            mouseout: () => setHoveredStopKey(null),
          }}
        >
          <Popup>
            <div className="text-xs p-1 min-w-[220px]">
              <div className="font-bold text-gray-900 mb-1 pb-1 border-b border-gray-200">
                {stop.stop_name} ({stop.ma_diem})
              </div>
              {fanned && (
                <div className="text-[10px] text-amber-700 mb-1">
                  Vị trí này có {visitsHere.length} lượt ghé (đã tách hiển thị dạng quạt, tọa độ thật không đổi).
                </div>
              )}
              <div className="space-y-1">
                {visitsHere.map((v) => (
                  <div
                    key={v.idx}
                    className={`rounded px-1.5 py-1 ${v.idx === idx ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: colorForJourneyDirection(v.direction) }}
                      >
                        {v.idx + 1}
                      </span>
                      <span className="font-semibold text-gray-800">{DIRECTION_LABEL[v.direction]}</span>
                    </div>
                    <div className="text-gray-600 text-[11px] mt-0.5">
                      Đến: <b>{v.stop.arrival || '—'}</b> · Xử lý: <b>{v.stop.handling || '—'}</b> · Đi: <b>{v.stop.departure || '—'}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Popup>
        </Marker>,
      );
    });
  });

  return (
    <>
      {polylineElements}
      {markerElements}
    </>
  );
}

export default function IntegratedMap({
  points,
  routes,
  spMissingCoordCount = 0,
  routesWarning = null,
}) {
  // Layer visibility — independent, both open by default (PO-locked).
  const [showServicePoints, setShowServicePoints] = useState(true);
  const [showLevel2Routes, setShowLevel2Routes] = useState(true);

  // --- Điểm phục vụ layer state (ported from ServicePointsMap.jsx) ---
  const [currentZoom, setCurrentZoom] = useState(HUE_MAP_DEFAULT_ZOOM);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [spSearchQuery, setSpSearchQuery] = useState('');
  const [showTamDung, setShowTamDung] = useState(false);

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
      if (counts[normCat] !== undefined) counts[normCat]++;
      else counts['Khác / Chưa phân loại']++;
    });
    return counts;
  }, [points]);

  const statusStats = useMemo(() => {
    const counts = { 'Hoạt động': 0, 'Ngừng hoạt động': 0, 'Chưa xác định': 0 };
    (points || []).forEach((p) => {
      const normStatus = normalizeTrangThai(p.trang_thai);
      if (counts[normStatus] !== undefined) counts[normStatus]++;
      else counts['Chưa xác định']++;
    });
    return counts;
  }, [points]);

  const tamDungCount = useMemo(
    () => (points || []).filter((p) => normalizeTrangThai(p.trang_thai) === 'Ngừng hoạt động').length,
    [points],
  );

  const filteredPoints = useMemo(() => {
    return (points || []).filter((p) => {
      const normCat = normalizeLoaiDiem(p.loai_diem);
      const normStatus = normalizeTrangThai(p.trang_thai);
      if (normStatus === 'Ngừng hoạt động' && !showTamDung && selectedStatus !== 'Ngừng hoạt động') return false;
      if (selectedCategory && normCat !== selectedCategory) return false;
      if (selectedStatus && normStatus !== selectedStatus) return false;
      if (spSearchQuery.trim()) {
        const q = spSearchQuery.toLowerCase().trim();
        const matchCode = (p.ma_diem || '').toLowerCase().includes(q);
        const matchName = (p.ten_diem || '').toLowerCase().includes(q);
        const matchAddr = (p.dia_chi || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchAddr) return false;
      }
      return true;
    });
  }, [points, selectedCategory, selectedStatus, spSearchQuery, showTamDung]);

  const showLabels = currentZoom >= ZOOM_LABEL_THRESHOLD_SERVICE;

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

  // --- Đường thư cấp 2 layer state (ported from Level2RoutesMap.jsx) ---
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [routeGeometries, setRouteGeometries] = useState({});
  const [journeyGeometry, setJourneyGeometry] = useState(null);
  const [journeyMode, setJourneyMode] = useState('all');
  const [hoveredStopKey, setHoveredStopKey] = useState(null);
  const [hoveredDirection, setHoveredDirection] = useState(null);

  // Reset ĐTC2 selection when the layer is hidden, so re-showing it always
  // starts from the clean 28-route overview rather than a stale journey view.
  useEffect(() => {
    if (!showLevel2Routes) setSelectedRouteId(null);
  }, [showLevel2Routes]);

  useEffect(() => {
    let cancelled = false;
    (routes || []).forEach((route) => {
      const geoStops = (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
      if (geoStops.length < 2) return;
      fetchRoadRoute(geoStops)
        .then((res) => {
          if (cancelled) return;
          setRouteGeometries((prev) => ({ ...prev, [route.id]: res }));
        })
        .catch((err) => {
          if (cancelled) return;
          setRouteGeometries((prev) => ({
            ...prev,
            [route.id]: {
              segments: [{ isRoad: false, positions: geoStops.map((s) => [s.lat, s.lon]), error: err.message }],
              hasFallback: true,
              warning: `Tuyến ${route.id}: không thể dựng đường giao thông thực tế (lỗi định tuyến ngoài dự kiến).`,
              excluded: [],
            },
          }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [routes]);

  const failedRoutingRouteIds = useMemo(
    () => Object.entries(routeGeometries)
      .filter(([, geo]) => geo.hasFallback)
      .map(([routeId]) => Number(routeId)),
    [routeGeometries],
  );

  const filteredRoutes = useMemo(() => {
    if (!routeSearchQuery.trim()) return routes || [];
    const q = routeSearchQuery.toLowerCase().trim();
    return (routes || []).filter((r) => {
      const matchName = (r.route_name || '').toLowerCase().includes(q);
      const matchId = String(r.id || '').includes(q);
      const matchStop = (r.stops || []).some(
        (s) => (s.stop_name || '').toLowerCase().includes(q) || (s.ma_diem || '').toLowerCase().includes(q),
      );
      return matchName || matchId || matchStop;
    });
  }, [routes, routeSearchQuery]);

  const activeRoute = useMemo(
    () => (routes || []).find((r) => r.id === selectedRouteId) || null,
    [routes, selectedRouteId],
  );
  const activeGeoStops = useMemo(
    () => (activeRoute ? (activeRoute.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number') : []),
    [activeRoute],
  );
  const activeClassification = useMemo(() => classifyStopDirections(activeGeoStops), [activeGeoStops]);

  useEffect(() => {
    setJourneyMode('all');
    setHoveredStopKey(null);
    setHoveredDirection(null);
    setJourneyGeometry(null);
  }, [selectedRouteId]);

  useEffect(() => {
    if (!activeRoute || activeGeoStops.length < 2) return;
    let cancelled = false;
    const { turnaroundIndex } = activeClassification;
    const outboundStops = turnaroundIndex === null ? activeGeoStops : activeGeoStops.slice(0, turnaroundIndex + 1);
    const returnStops = turnaroundIndex === null ? [] : activeGeoStops.slice(turnaroundIndex);

    fetchRoadRoute(outboundStops).then((res) => {
      if (cancelled) return;
      setJourneyGeometry((prev) => ({ ...(prev || {}), outbound: res }));
    });
    if (returnStops.length >= 2) {
      fetchRoadRoute(returnStops).then((res) => {
        if (cancelled) return;
        setJourneyGeometry((prev) => ({ ...(prev || {}), return: res }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [activeRoute, activeGeoStops, activeClassification]);

  const hasTurnaround = activeClassification.turnaroundIndex !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
      {/* Map view */}
      <div style={{ height: '72vh' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
        <MapContainer center={HUE_MAP_CENTER} zoom={HUE_MAP_DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <ZoomTracker onZoomChange={setCurrentZoom} />
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />

          {/* ---- Điểm phục vụ layer ---- */}
          {showServicePoints && filteredPoints.map((point) => {
            const normCat = normalizeLoaiDiem(point.loai_diem);
            const normStatus = normalizeTrangThai(point.trang_thai);
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
              <Marker key={`sp-${point.ma_diem}`} position={[point.lat, point.lon]} icon={customIcon}>
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

          {/* ---- Đường thư cấp 2 layer ---- */}
          {showLevel2Routes && filteredRoutes.flatMap((route) => {
            if (activeRoute && route.id === activeRoute.id) return [];
            const geoStops = (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
            if (geoStops.length < 2) return [];

            const isHovered = hoveredRouteId === route.id;
            const color = colorForRouteId(route.id);
            const opacity = selectedRouteId != null ? 0.15 : (isHovered ? 0.95 : 0.7);
            const eventHandlers = {
              click: () => setSelectedRouteId(route.id),
              mouseover: () => setHoveredRouteId(route.id),
              mouseout: () => setHoveredRouteId(null),
            };
            const tooltip = (
              <Tooltip sticky>
                <div className="font-bold text-xs">
                  Tuyến {route.id} — {route.route_name}
                </div>
                <div className="text-[11px]">
                  {route.declared_km ?? '—'} km · {geoStops.length} điểm dừng
                  {failedRoutingRouteIds.includes(route.id) && (
                    <span className="text-amber-700 font-semibold"> · ⚠️ Chưa dựng được đường giao thông thực tế</span>
                  )}
                </div>
              </Tooltip>
            );

            const geo = routeGeometries[route.id];

            if (!geo) {
              return [
                <Polyline
                  key={`${route.id}-loading`}
                  positions={geoStops.map((s) => [s.lat, s.lon])}
                  pathOptions={{ color: '#9CA3AF', weight: isHovered ? 4 : 2, opacity: opacity * 0.7, dashArray: '3, 5' }}
                  eventHandlers={eventHandlers}
                >
                  {tooltip}
                </Polyline>,
              ];
            }

            return geo.segments.map((seg, idx) => (
              <Polyline
                key={`${route.id}-seg-${idx}-${seg.isRoad ? 'road' : 'fallback'}`}
                positions={seg.positions}
                pathOptions={
                  seg.isRoad
                    ? { color, weight: isHovered ? 5 : 2.5, opacity, dashArray: null }
                    : { color: '#F59E0B', weight: isHovered ? 5 : 3, opacity, dashArray: '8, 8' }
                }
                eventHandlers={eventHandlers}
              >
                {tooltip}
              </Polyline>
            ));
          })}

          {showLevel2Routes && !activeRoute && filteredRoutes.flatMap((route) => {
            const geoStops = (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
            const totalStops = geoStops.length;
            const color = colorForRouteId(route.id);

            return geoStops.map((stop, idx) => {
              const stopNum = idx + 1;
              const isStart = stopNum === 1;
              const isEnd = stopNum === totalStops;
              const badgeBg = isStart ? '#16A34A' : isEnd ? '#DC2626' : color;
              const iconHtml = `
                <div style="
                  width: 22px;
                  height: 22px;
                  border-radius: 50%;
                  background: ${badgeBg};
                  color: white;
                  font-weight: 700;
                  font-size: 11px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">
                  ${stopNum}
                </div>
              `;
              const customIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-stop-marker',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
              });

              return (
                <Marker key={`l2-${route.id}-${stop.id || idx}`} position={[stop.lat, stop.lon]} icon={customIcon}>
                  <Popup>
                    <div className="text-xs p-1">
                      <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-gray-200">
                        <span
                          className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: badgeBg }}
                        >
                          {stopNum}
                        </span>
                        <span className="font-bold text-gray-900">{stop.stop_name} ({stop.ma_diem})</span>
                      </div>
                      <div className="text-gray-600 space-y-0.5">
                        <div><b>Tuyến:</b> Tuyến {route.id} — {route.route_name}</div>
                        <div><b>Loại điểm:</b> {isStart ? 'Điểm Đầu' : isEnd ? 'Điểm Cuối' : 'Điểm Trung chuyển'}</div>
                        <div><b>Giờ đến:</b> {stop.arrival || '—'}</div>
                        <div><b>Thời gian xử lý:</b> {stop.handling || '—'}</div>
                        <div><b>Giờ đi:</b> {stop.departure || '—'}</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            });
          })}

          {showLevel2Routes && activeRoute && activeGeoStops.length >= 2 && (
            <SelectedRouteJourneyLayer
              route={activeRoute}
              mode={journeyMode}
              geometry={journeyGeometry}
              hoveredStopKey={hoveredStopKey}
              setHoveredStopKey={setHoveredStopKey}
              hoveredDirection={hoveredDirection}
              setHoveredDirection={setHoveredDirection}
            />
          )}
        </MapContainer>

        {/* ---- Overlays ---- */}
        {showServicePoints && (
          <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg px-2.5 py-1 text-xs text-gray-700 font-medium">
            Zoom: {currentZoom} {showLabels ? '• Hiển thị: Mã bưu cục - Tên điểm' : '• Zoom ≥ 13 để hiện Mã - Tên'}
          </div>
        )}

        {showLevel2Routes && failedRoutingRouteIds.length > 0 && (
          <div className="absolute top-2 left-2 z-[1000] bg-amber-50/95 border border-amber-300 text-amber-900 rounded-lg px-3 py-1.5 text-xs shadow-md max-w-md">
            ⚠️ {failedRoutingRouteIds.length} hành trình chưa dựng được đường giao thông thực tế (đã thử cả 2 nhà cung cấp OSRM): Tuyến {failedRoutingRouteIds.join(', ')}. Đoạn nối thẳng hiển thị KHÔNG phải tuyến đường thực tế; các hành trình khác không bị ảnh hưởng.
          </div>
        )}

        {showLevel2Routes && activeRoute && hasTurnaround && (
          <div className="absolute top-12 left-2 z-[1000] bg-white/95 backdrop-blur border border-gray-300 shadow-md rounded-lg p-1 flex gap-1 text-xs">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setJourneyMode(m.value)}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  journeyMode === m.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {showLevel2Routes && activeRoute && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-blue-200 shadow-md rounded-xl p-3 max-w-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-blue-900 text-xs">Đang chọn: Tuyến {activeRoute.id}</span>
              <button
                type="button"
                onClick={() => setSelectedRouteId(null)}
                className="text-[11px] text-gray-500 hover:text-gray-700"
              >
                ✕ Bỏ chọn
              </button>
            </div>
            <div className="text-xs text-gray-700 font-semibold">{activeRoute.route_name}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {activeRoute.declared_km ?? '—'} km • {activeRoute.trips_per_week ?? '—'} chuyến/tuần • {(activeRoute.stops || []).length} lượt dừng
            </div>
            {hasTurnaround ? (
              <div className="text-[11px] mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorForJourneyDirection('outbound') }} /> Chiều đi
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorForJourneyDirection('return') }} /> Chiều về
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5" style={{ backgroundColor: colorForJourneyDirection('turnaround') }} /> Quay đầu: {activeGeoStops[activeClassification.turnaroundIndex]?.stop_name}
                </span>
              </div>
            ) : (
              <div className="text-[11px] mt-1 text-gray-500">Hành trình một chiều — không phát hiện lượt quay đầu.</div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm flex flex-col gap-3 shadow-sm overflow-y-auto max-h-[72vh]">
        {/* Layer visibility — independent toggles, PO-locked */}
        <div>
          <div className="font-bold text-gray-900 mb-1.5">Lớp bản đồ</div>
          <div className="space-y-1.5">
            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs cursor-pointer select-none">
              <span className="font-medium text-gray-700">Điểm phục vụ ({points.length})</span>
              <input
                type="checkbox"
                checked={showServicePoints}
                onChange={(e) => setShowServicePoints(e.target.checked)}
                className="h-3.5 w-3.5 accent-blue-600"
              />
            </label>
            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs cursor-pointer select-none">
              <span className="font-medium text-gray-700">Đường thư cấp 2 ({(routes || []).length})</span>
              <input
                type="checkbox"
                checked={showLevel2Routes}
                onChange={(e) => setShowLevel2Routes(e.target.checked)}
                className="h-3.5 w-3.5 accent-blue-600"
              />
            </label>
          </div>
        </div>

        {spMissingCoordCount > 0 && showServicePoints && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            {spMissingCoordCount} điểm thiếu tọa độ, không hiển thị trên bản đồ.
          </div>
        )}
        {routesWarning && showLevel2Routes && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            {routesWarning}
          </div>
        )}

        {/* ---- Điểm phục vụ panel ---- */}
        {showServicePoints && (
          <div className="pt-2 border-t border-gray-100">
            <input
              type="text"
              placeholder="Tìm theo mã, tên, địa chỉ..."
              value={spSearchQuery}
              onChange={(e) => setSpSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none mb-2"
            />

            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs cursor-pointer select-none mb-2">
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

            <div className="mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-gray-800 text-xs">Loại điểm (Tổng: {Object.values(categoryStats).reduce((a, b) => a + b, 0)}/{points.length})</span>
                {selectedCategory && (
                  <button type="button" onClick={() => setSelectedCategory(null)} className="text-[10px] text-blue-600 hover:underline font-semibold">
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
                        isSelected ? 'border-blue-500 bg-blue-50/80 shadow-xs font-semibold' : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span dangerouslySetInnerHTML={{ __html: iconSvg }} className="shrink-0 leading-none" />
                        <span className="truncate text-[11px]">{label}</span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-gray-800 text-xs">Trạng thái (Tổng: {Object.values(statusStats).reduce((a, b) => a + b, 0)}/{points.length})</span>
                {selectedStatus && (
                  <button type="button" onClick={() => setSelectedStatus(null)} className="text-[10px] text-blue-600 hover:underline font-semibold">
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
                        isSelected ? 'border-blue-500 bg-blue-50/80 shadow-xs font-semibold' : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span dangerouslySetInnerHTML={{ __html: iconSvg }} className="shrink-0 leading-none" />
                        <span className="truncate text-[11px]">{label}</span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---- Đường thư cấp 2 panel ---- */}
        {showLevel2Routes && (
          <div className="pt-2 border-t border-gray-100 flex flex-col min-h-0">
            <div className="font-bold text-gray-900 mb-1 text-xs">Danh sách hành trình ({filteredRoutes.length}/{(routes || []).length})</div>
            <input
              type="text"
              placeholder="Tìm mã tuyến, tên tuyến, điểm dừng..."
              value={routeSearchQuery}
              onChange={(e) => setRouteSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none mb-2"
            />

            {activeRoute ? (
              <div className="border border-blue-200 rounded-xl bg-blue-50/50 p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-900">Chi tiết lượt dừng (Tuyến {activeRoute.id})</span>
                  <button type="button" onClick={() => setSelectedRouteId(null)} className="text-[11px] text-blue-700 hover:underline font-semibold">
                    Xem tất cả tuyến
                  </button>
                </div>
                <div className="space-y-1.5">
                  {activeGeoStops.map((stop, idx) => {
                    const direction = activeClassification.directions[idx] || 'outbound';
                    const stopNum = idx + 1;
                    const stopKey = `${activeRoute.id}:${idx}`;
                    const isHighlighted = hoveredStopKey === stopKey || hoveredDirection === direction;
                    if (journeyMode === 'outbound' && direction === 'return') return null;
                    if (journeyMode === 'return' && direction === 'outbound') return null;

                    return (
                      <div
                        key={stop.id || idx}
                        onMouseEnter={() => setHoveredStopKey(stopKey)}
                        onMouseLeave={() => setHoveredStopKey(null)}
                        className={`bg-white border rounded-lg p-2 text-xs flex gap-2 transition-colors ${
                          isHighlighted ? 'border-blue-400 ring-1 ring-blue-300 bg-blue-50/60' : 'border-gray-200'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: colorForJourneyDirection(direction) }}
                        >
                          {stopNum}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
                            {stop.stop_name} <span className="text-gray-500 text-[11px]">({stop.ma_diem})</span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${colorForJourneyDirection(direction)}22`, color: colorForJourneyDirection(direction) }}
                            >
                              {DIRECTION_LABEL[direction]}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-2 mt-0.5">
                            <span>Đến: <b>{stop.arrival || '—'}</b></span>
                            <span>Xử lý: <b>{stop.handling || '—'}</b></span>
                            <span>Đi: <b>{stop.departure || '—'}</b></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1 border border-gray-100 rounded-lg p-1">
                {filteredRoutes.map((route) => {
                  const isSelected = selectedRouteId === route.id;
                  const color = colorForRouteId(route.id);
                  return (
                    <button
                      type="button"
                      key={route.id}
                      onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                      className={`w-full text-left p-2 rounded-lg border transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50 shadow-sm font-semibold' : 'border-transparent hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-bold text-gray-900 text-xs">Tuyến {route.id}</span>
                        <span className="text-[11px] text-gray-500 truncate">{route.route_name}</span>
                        {failedRoutingRouteIds.includes(route.id) && (
                          <span title="Chưa dựng được đường giao thông thực tế" className="text-amber-600 text-[11px] shrink-0">⚠️</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 ml-5 mt-0.5 flex justify-between">
                        <span>{route.declared_km ?? '—'} km</span>
                        <span>{route.trips_per_week ?? '—'} chuyến/tuần</span>
                        <span>{(route.stops || []).length} lượt dừng</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-2 border-t border-gray-100 text-[10px] text-gray-500 leading-tight">
          • Dữ liệu đọc trực tiếp từ Mạng điểm phục vụ và Mạng đường thư cấp 2 — không sao chép, không có Import/Export riêng.<br />
          • Bật/tắt từng lớp độc lập ở trên. Chọn 1 tuyến ĐTC2 để xem chi tiết hành trình.
        </div>
      </div>
    </div>
  );
}
