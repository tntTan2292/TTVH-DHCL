import { useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { colorForRouteId, HUE_MAP_CENTER, HUE_MAP_DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from './mapStyles';

/**
 * Pure display component. Draws each Mạng đường thư cấp 2 route as a
 * polyline through its recorded stop coordinates (current network / "mạng
 * cũ" per the locked Product Owner decision) — not a reorganization
 * proposal, and not a live OSRM road-snap call.
 */
export default function Level2RoutesMap({ routes, selectedRouteId, onSelectRoute }) {
  const [hoveredRouteId, setHoveredRouteId] = useState(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
      <div style={{ height: '70vh' }} className="rounded-xl overflow-hidden border border-gray-200">
        <MapContainer center={HUE_MAP_CENTER} zoom={HUE_MAP_DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />
          {routes.map((route) => {
            const geoStops = (route.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
            if (geoStops.length < 2) return null;
            const isEmphasized = selectedRouteId === route.id || hoveredRouteId === route.id;
            return (
              <Polyline
                key={route.id}
                positions={geoStops.map((s) => [s.lat, s.lon])}
                pathOptions={{
                  color: colorForRouteId(route.id),
                  weight: isEmphasized ? 5 : 2.5,
                  opacity: isEmphasized || selectedRouteId == null ? 0.85 : 0.25,
                }}
                eventHandlers={{
                  click: () => onSelectRoute?.(route.id),
                  mouseover: () => setHoveredRouteId(route.id),
                  mouseout: () => setHoveredRouteId(null),
                }}
              >
                <Tooltip sticky>Tuyến {route.id} — {route.route_name}</Tooltip>
              </Polyline>
            );
          })}
          {routes.flatMap((route) => (route.stops || [])
            .filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number')
            .map((stop) => (
              <CircleMarker
                key={`${route.id}-${stop.id}`}
                center={[stop.lat, stop.lon]}
                radius={4}
                pathOptions={{ color: 'white', weight: 1, fillColor: colorForRouteId(route.id), fillOpacity: 0.9 }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold">{stop.stop_name} ({stop.ma_diem})</div>
                    <div>Tuyến: {route.route_name}</div>
                    <div>Đến: {stop.arrival || '—'} · Xử lý: {stop.handling || '—'} · Đi: {stop.departure || '—'}</div>
                  </div>
                </Popup>
              </CircleMarker>
            )))}
        </MapContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm max-h-[70vh] overflow-auto">
        <div className="font-semibold mb-2">Danh sách hành trình ({routes.length})</div>
        {routes.map((route) => (
          <button
            type="button"
            key={route.id}
            onClick={() => onSelectRoute?.(selectedRouteId === route.id ? null : route.id)}
            className={`w-full text-left px-2 py-1.5 rounded mb-1 border ${selectedRouteId === route.id ? 'border-vnpost-blue bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: colorForRouteId(route.id) }} />
            <span className="font-medium">Tuyến {route.id}</span> — {route.route_name}
            <div className="text-xs text-gray-500 ml-4">{route.declared_km ?? '—'} km · {route.trips_per_week ?? '—'} chuyến/tuần</div>
          </button>
        ))}
      </div>
    </div>
  );
}
