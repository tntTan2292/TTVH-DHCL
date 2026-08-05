import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { SERVICE_POINT_COLORS, colorForServicePointType, HUE_MAP_CENTER, HUE_MAP_DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from './mapStyles';

/**
 * Pure display component: takes already-fetched points as a prop, renders
 * Leaflet only. Phase 3 Import can swap the data source feeding `points`
 * without touching this component.
 */
export default function ServicePointsMap({ points }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
      <div style={{ height: '70vh' }} className="rounded-xl overflow-hidden border border-gray-200">
        <MapContainer center={HUE_MAP_CENTER} zoom={HUE_MAP_DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />
          {points.map((point) => (
            <CircleMarker
              key={point.ma_diem}
              center={[point.lat, point.lon]}
              radius={7}
              pathOptions={{
                color: 'white',
                weight: 1.5,
                fillColor: colorForServicePointType(point.loai_diem),
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold mb-1">{point.ma_diem} — {point.ten_diem}</div>
                  <div><b>Loại điểm:</b> {point.loai_diem || 'Không xác định'}</div>
                  <div><b>Địa chỉ:</b> {point.dia_chi || 'Không xác định'}</div>
                  <div><b>Phường/Xã:</b> {point.phuong_xa || 'Không xác định'}</div>
                  <div><b>Đơn vị quản lý:</b> {point.don_vi_quan_ly || 'Không xác định'}</div>
                  <div><b>Trạng thái:</b> {point.trang_thai || 'Không xác định'}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm">
        <div className="font-semibold mb-2">Chú giải loại điểm</div>
        {Object.entries(SERVICE_POINT_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
