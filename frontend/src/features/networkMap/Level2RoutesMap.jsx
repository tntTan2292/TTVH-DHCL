import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  colorForRouteId,
  colorForJourneyDirection,
  createDirectionArrowSvg,
  createJourneyStopSvg,
  HUE_MAP_CENTER,
  HUE_MAP_DEFAULT_ZOOM,
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

const DIRECTION_LABEL = { outbound: 'Chiều đi', return: 'Chiều về', turnaround: 'Quay đầu' };
const MODES = [
  { value: 'all', label: 'Toàn hành trình' },
  { value: 'outbound', label: 'Chiều đi' },
  { value: 'return', label: 'Chiều về' },
];
const FAN_RADIUS_PX = 16; // spiderfy fan radius, in screen pixels — zoom-invariant
const LINE_OFFSET_PX = 3; // perpendicular separation between outbound/return lines when both drawn
// PO arrow-visibility remediation: arrows were reported "too small to see
// without zooming to max". ARROW_ICON_SIZE_PX matches the larger default in
// createDirectionArrowSvg; ARROW_SIDE_OFFSET_PX nudges each arrow off the
// line centerline (never directly under it, never over a stop marker), on
// the *right-hand side relative to its own direction of travel* — a single
// consistent rule that, for two opposite-direction legs on the same road,
// automatically lands outbound and return arrows on opposite physical sides.
const ARROW_ICON_SIZE_PX = 26;
const ARROW_SIDE_OFFSET_PX = 13;

/**
 * ĐTC2 journey visual remediation — renders one selected route's stops and
 * road geometry split by chiều đi/chiều về, highlights the quay đầu (turnaround)
 * stop, and spiderfies same-coordinate revisits into a small fan so no lượt
 * dừng is ever visually hidden under another. Lives inside <MapContainer> so
 * it can use the Leaflet map instance for pixel-space projection (spiderfy
 * fan + dual-line offset are computed in screen pixels, not degrees, so they
 * stay visually consistent at any zoom level) — recomputed on every
 * zoom/pan via `epoch`. Never mutates `stop.lat`/`stop.lon`; every offset
 * here is a derived *display* position only.
 */
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

  // `epoch` (bumped on zoomend/moveend) is not read directly — its role is
  // purely to force this component to re-render so project()/unproject()
  // below recompute against the map's *current* view. React re-runs the
  // whole function body on every state update regardless of whether the
  // new value is referenced, so this satisfies that without a lint issue.
  void epoch;

  const project = (lat, lon) => map.latLngToLayerPoint([lat, lon]);
  const unproject = (point) => map.layerPointToLatLng(point);

  // Places direction-of-travel arrows along a rendered leg's road geometry:
  // count scaled to the leg's real length (PO arrow-visibility remediation
  // §6), each nudged ARROW_SIDE_OFFSET_PX to the right of its own travel
  // direction (§3/§4 — a single consistent rule that puts outbound/return
  // arrows on opposite physical sides of the road for a there-and-back leg),
  // sized ARROW_ICON_SIZE_PX (fixed screen pixels, so it reads clearly at
  // the default zoom and never grows further when zooming in, §2/§5).
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

  // --- Road-geometry polylines (outbound / return), offset apart in pixel
  // space only when both are drawn together and would otherwise coincide.
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

  // --- Stop markers, spiderfied when multiple visits share a coordinate.
  const markerElements = [];
  groupedByCoordinate.forEach((indices, coordKey) => {
    const fanned = indices.length > 1;
    const angles = fanAngles(indices.length);
    const [lat0, lon0] = coordKey.split(',').map(Number);

    indices.forEach((idx, fanPos) => {
      const direction = directions[idx];
      // In single-direction modes, hide stops of the other direction (the
      // turnaround itself is always shown — it belongs to both legs).
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

export default function Level2RoutesMap({ routes, selectedRouteId, onSelectRoute }) {
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Per-route road geometry from the shared OSRM routing helper (PO Gate 3
  // remediation §1). Keyed by route.id → { segments, hasFallback, warning, excluded }.
  // Route ID, stop order, and coordinate source (network_service_point via
  // ma_diem, already denormalized onto each stop at import time) are unchanged.
  const [routeGeometries, setRouteGeometries] = useState({});
  // Direction-split geometry for the currently-selected route only (outbound
  // and return legs fetched independently). Journey visual remediation —
  // lazy, fetched only on selection, never for the unselected 28-route overview.
  const [journeyGeometry, setJourneyGeometry] = useState(null);
  const [journeyMode, setJourneyMode] = useState('all');
  const [hoveredStopKey, setHoveredStopKey] = useState(null);
  const [hoveredDirection, setHoveredDirection] = useState(null);

  // Fetch road-network geometry for every route with ≥2 geo-valid stops, in
  // stop order. One route's routing failure never blocks another's — each
  // route is fetched and stored independently, and fetchRoadRoute already
  // isolates per-chunk failures inside a single route.
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

  // Routes whose road geometry could not be built via either OSRM provider —
  // must be surfaced explicitly, never silently shown as if they were real
  // road geometry (PO Gate 3 remediation §1/§2).
  const failedRoutingRouteIds = useMemo(
    () => Object.entries(routeGeometries)
      .filter(([, geo]) => geo.hasFallback)
      .map(([routeId]) => Number(routeId)),
    [routeGeometries],
  );

  // Filter routes based on search query
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return routes;
    const q = searchQuery.toLowerCase().trim();
    return routes.filter((r) => {
      const matchName = (r.route_name || '').toLowerCase().includes(q);
      const matchId = String(r.id || '').includes(q);
      const matchStop = (r.stops || []).some(
        (s) => (s.stop_name || '').toLowerCase().includes(q) || (s.ma_diem || '').toLowerCase().includes(q)
      );
      return matchName || matchId || matchStop;
    });
  }, [routes, searchQuery]);

  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  const activeGeoStops = useMemo(
    () => (activeRoute ? (activeRoute.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number') : []),
    [activeRoute],
  );
  const activeClassification = useMemo(() => classifyStopDirections(activeGeoStops), [activeGeoStops]);

  // Reset the journey view (mode + hover state) whenever the selected route changes.
  useEffect(() => {
    setJourneyMode('all');
    setHoveredStopKey(null);
    setHoveredDirection(null);
    setJourneyGeometry(null);
  }, [selectedRouteId]);

  // Lazily fetch outbound/return road geometry for the selected route only.
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
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />

          {/* Render road-network geometry (or a distinctly-styled loading/fallback
              placeholder) for each route, split into one Polyline per routing
              segment so real-road and failed-to-route legs are visually and
              functionally distinct — never a straight line disguised as road
              geometry (PO Gate 3 remediation §1). The active (selected) route's
              overview line is skipped here — SelectedRouteJourneyLayer replaces
              it with the outbound/return-split visualization below. */}
          {filteredRoutes.flatMap((route) => {
            if (activeRoute && route.id === activeRoute.id) return [];
            const geoStops = (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
            if (geoStops.length < 2) return [];

            const isHovered = hoveredRouteId === route.id;
            const color = colorForRouteId(route.id);
            const opacity = selectedRouteId != null ? 0.15 : (isHovered ? 0.95 : 0.7);
            const eventHandlers = {
              click: () => onSelectRoute?.(route.id),
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
              // Still loading this route's road geometry — neutral gray dashed
              // placeholder, distinct from both real road and confirmed fallback.
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

          {/* Render stop markers with sequence numbers for unselected routes
              (the active/selected route's stops are rendered — spiderfied,
              direction-colored — by SelectedRouteJourneyLayer instead). */}
          {!activeRoute && filteredRoutes.flatMap((route) => {
            const geoStops = (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
            const totalStops = geoStops.length;
            const color = colorForRouteId(route.id);

            return geoStops.map((stop, idx) => {
              const stopNum = idx + 1;
              const isStart = stopNum === 1;
              const isEnd = stopNum === totalStops;

              // Node hierarchy colors: Start (Green), End (Red), Intermediate (Route color)
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
                <Marker key={`${route.id}-${stop.id || idx}`} position={[stop.lat, stop.lon]} icon={customIcon}>
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

          {activeRoute && activeGeoStops.length >= 2 && (
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

          {/* Warning Overlay: routes whose road geometry could not be built —
              explicit, per-route, never silent. Other valid routes are unaffected. */}
          {failedRoutingRouteIds.length > 0 && (
            <div className="absolute top-2 left-2 z-[1000] bg-amber-50/95 border border-amber-300 text-amber-900 rounded-lg px-3 py-1.5 text-xs shadow-md max-w-md">
              ⚠️ {failedRoutingRouteIds.length} hành trình chưa dựng được đường giao thông thực tế (đã thử cả 2 nhà cung cấp OSRM): Tuyến {failedRoutingRouteIds.join(', ')}. Đoạn nối thẳng hiển thị KHÔNG phải tuyến đường thực tế; các hành trình khác không bị ảnh hưởng.
            </div>
          )}

          {/* Chế độ hiển thị: Toàn hành trình | Chiều đi | Chiều về */}
          {activeRoute && hasTurnaround && (
            <div className="absolute top-2 left-2 z-[1000] bg-white/95 backdrop-blur border border-gray-300 shadow-md rounded-lg p-1 flex gap-1 text-xs">
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

          {/* Quick Info Badge */}
          {activeRoute && (
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-blue-200 shadow-md rounded-xl p-3 max-w-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-blue-900 text-xs">Đang chọn: Tuyến {activeRoute.id}</span>
                <button
                  type="button"
                  onClick={() => onSelectRoute?.(null)}
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

      {/* Route List & Stop Sequence Sidebar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm flex flex-col gap-3 shadow-sm max-h-[72vh] overflow-hidden">
        <div>
          <div className="font-bold text-gray-900 mb-1">Danh sách hành trình ({filteredRoutes.length}/28)</div>
          <input
            type="text"
            placeholder="Tìm mã tuyến, tên tuyến, điểm dừng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2.5 py-1 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Selected Route Timetable Drawer */}
        {activeRoute ? (
          <div className="border border-blue-200 rounded-xl bg-blue-50/50 p-2.5 flex flex-col gap-2 overflow-hidden flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-900">Chi tiết lượt dừng (Tuyến {activeRoute.id})</span>
              <button
                type="button"
                onClick={() => onSelectRoute?.(null)}
                className="text-[11px] text-blue-700 hover:underline font-semibold"
              >
                Xem tất cả tuyến
              </button>
            </div>
            <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
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
          /* Route List */
          <div className="overflow-y-auto space-y-1 flex-1 pr-1 border border-gray-100 rounded-lg p-1">
            {filteredRoutes.map((route) => {
              const isSelected = selectedRouteId === route.id;
              const color = colorForRouteId(route.id);

              return (
                <button
                  type="button"
                  key={route.id}
                  onClick={() => onSelectRoute?.(isSelected ? null : route.id)}
                  className={`w-full text-left p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm font-semibold'
                      : 'border-transparent hover:bg-gray-50 text-gray-700'
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

        <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 leading-tight">
          • Xem 1 tuyến: chiều đi (xanh), chiều về (tím), quay đầu (kim cương vàng); lượt dừng cùng tọa độ tách hình quạt, giữ nguyên tọa độ thật.
        </div>
      </div>
    </div>
  );
}
