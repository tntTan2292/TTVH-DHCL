import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colorForRouteId, HUE_MAP_CENTER, HUE_MAP_DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from './mapStyles';

export default function Level2RoutesMap({ routes, selectedRouteId, onSelectRoute }) {
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
      {/* Map view */}
      <div style={{ height: '72vh' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
        <MapContainer center={HUE_MAP_CENTER} zoom={HUE_MAP_DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />

          {/* Render polyline for each route */}
          {filteredRoutes.map((route) => {
            const geoStops = (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
            if (geoStops.length < 2) return null;

            const isSelected = selectedRouteId === route.id;
            const isHovered = hoveredRouteId === route.id;
            const isEmphasized = isSelected || isHovered;
            const color = colorForRouteId(route.id);

            return (
              <Polyline
                key={route.id}
                positions={geoStops.map((s) => [s.lat, s.lon])}
                pathOptions={{
                  color,
                  weight: isEmphasized ? 5 : 2.5,
                  opacity: selectedRouteId != null ? (isSelected ? 1.0 : 0.15) : (isHovered ? 0.95 : 0.7),
                }}
                eventHandlers={{
                  click: () => onSelectRoute?.(route.id),
                  mouseover: () => setHoveredRouteId(route.id),
                  mouseout: () => setHoveredRouteId(null),
                }}
              >
                <Tooltip sticky>
                  <div className="font-bold text-xs">
                    Tuyến {route.id} — {route.route_name}
                  </div>
                  <div className="text-[11px]">
                    {route.declared_km ?? '—'} km · {geoStops.length} điểm dừng
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

          {/* Render stop markers with sequence numbers for selected or all routes */}
          {filteredRoutes.flatMap((route) => {
            const geoStops = (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
            const isSelected = selectedRouteId === route.id;
            // When a route is selected, show only stops of the selected route or render all if none selected
            if (selectedRouteId != null && !isSelected) return [];

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
        </MapContainer>

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
              {(activeRoute.stops || []).map((stop, idx) => {
                const stopNum = idx + 1;
                const isStart = stopNum === 1;
                const isEnd = stopNum === (activeRoute.stops || []).length;
                const badgeBg = isStart ? '#16A34A' : isEnd ? '#DC2626' : colorForRouteId(activeRoute.id);

                return (
                  <div key={stop.id || idx} className="bg-white border border-gray-200 rounded-lg p-2 text-xs flex gap-2">
                    <span
                      className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: badgeBg }}
                    >
                      {stopNum}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {stop.stop_name} <span className="text-gray-500 text-[11px]">({stop.ma_diem})</span>
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
          • Phân cấp Node lượt dừng: Green (Đầu ca #1), Red (Cuối ca #N), Badge (Số thứ tự lượt).
        </div>
      </div>
    </div>
  );
}

