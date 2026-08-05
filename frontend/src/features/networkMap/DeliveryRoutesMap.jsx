import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  HUE_MAP_CENTER,
  HUE_MAP_DEFAULT_ZOOM,
  ZOOM_LABEL_THRESHOLD_DELIVERY,
  colorForDeliveryService,
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
} from './mapStyles';

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
  const positions = points.map((p) => [p.lat, p.lon]);
  const showLabels = currentZoom >= ZOOM_LABEL_THRESHOLD_DELIVERY;

  const totalPoints = points.length;

  return (
    <div style={{ height: '70vh' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
      <MapContainer center={positions[0] || HUE_MAP_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
        <ZoomTracker onZoomChange={setCurrentZoom} />
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={20} />

        {/* Route Polyline connecting points chronologically */}
        {positions.length >= 2 && (
          <Polyline positions={positions} pathOptions={{ color: '#1D4ED8', weight: 4, opacity: 0.8, dashArray: '6, 6' }} />
        )}

        {/* Delivery Points Markers */}
        {points.map((p, index) => {
          const sequenceNum = index + 1;
          const isStart = sequenceNum === 1;
          const isEnd = sequenceNum === totalPoints;
          const serviceColor = colorForDeliveryService(p.loai_dich_vu);

          const badgeBg = isStart ? '#16A34A' : isEnd ? '#DC2626' : serviceColor;
          const badgeText = isStart ? 'START' : isEnd ? 'END' : `${sequenceNum}`;

          const iconHtml = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="
                min-width: 22px;
                height: 22px;
                padding: 0 4px;
                border-radius: 11px;
                background: ${badgeBg};
                color: white;
                font-weight: 800;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              ">
                ${badgeText}
              </div>
              ${
                showLabels
                  ? `<div style="
                      position: absolute;
                      left: 26px;
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
                      <span style="color: ${serviceColor}; margin-right: 4px;">#${sequenceNum}</span>
                      ${p.ma_buu_gui} (${p.status_time || '—'})
                    </div>`
                  : ''
              }
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-delivery-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          return (
            <Marker key={`${p.id || p.ma_buu_gui}-${index}`} position={[p.lat, p.lon]} icon={customIcon}>
              <Popup>
                <div className="text-xs p-1 min-w-[210px]">
                  <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-gray-200">
                    <span className="font-bold text-gray-900 text-sm">{p.ma_buu_gui}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: serviceColor }}
                    >
                      Điểm #{sequenceNum}
                    </span>
                  </div>
                  <div className="text-gray-700 space-y-1">
                    <div><b>Giờ phát:</b> <span className="font-semibold text-blue-700">{p.status_time || '—'}</span></div>
                    <div><b>Loại dịch vụ:</b> {p.loai_dich_vu || '—'}</div>
                    <div>
                      <b>Thu hộ (COD):</b>{' '}
                      <span className="font-bold text-emerald-700">
                        {typeof p.tien_thu_ho === 'number' ? p.tien_thu_ho.toLocaleString('vi-VN') : '0'} đ
                      </span>
                    </div>
                    {p.ma_bcvh && <div><b>Mã BCVH:</b> {p.ma_bcvh}</div>}
                    {p.postman_code && <div><b>Bưu tá:</b> {p.postman_code}</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Zoom Status Overlay */}
      <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg px-2.5 py-1 text-xs text-gray-700 font-medium">
        Zoom: {currentZoom} {showLabels ? '• Hiển thị mã bưu gửi & giờ' : '• Zoom ≥ 14 để hiện mã'}
      </div>
    </div>
  );
}

