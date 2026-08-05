import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { HUE_MAP_CENTER, HUE_MAP_DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from './mapStyles';

/**
 * Pure display component. Only ever receives the points for one
 * Ngày+BCVH+Bưu tá selection (never a full month) — points already sorted
 * by status_time by the API.
 */
export default function DeliveryRoutesMap({ points }) {
  const positions = points.map((p) => [p.lat, p.lon]);

  return (
    <div style={{ height: '65vh' }} className="rounded-xl overflow-hidden border border-gray-200">
      <MapContainer center={HUE_MAP_CENTER} zoom={HUE_MAP_DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />
        {positions.length >= 2 && (
          <Polyline positions={positions} pathOptions={{ color: '#1D4ED8', weight: 3, opacity: 0.7 }} />
        )}
        {points.map((p, index) => (
          <CircleMarker
            key={`${p.id}-${index}`}
            center={[p.lat, p.lon]}
            radius={5}
            pathOptions={{ color: 'white', weight: 1, fillColor: '#1D4ED8', fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{p.ma_buu_gui}</div>
                <div>Giờ: {p.status_time || '—'}</div>
                <div>Dịch vụ: {p.loai_dich_vu || '—'}</div>
                <div>Thu hộ: {typeof p.tien_thu_ho === 'number' ? p.tien_thu_ho.toLocaleString('vi-VN') : '—'} đ</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
