import { useCallback, useEffect, useState } from 'react';
import networkMapClient from '../../api/NetworkMapClient';
import IntegratedMap from './IntegratedMap';
import MapStateBanner from './MapStateBanner';

/**
 * IntegratedMapPage — NETWORK-MANAGEMENT-002.
 *
 * Fetches Mạng điểm phục vụ and Mạng đường thư cấp 2 independently, via the
 * exact same `networkMapClient` methods `ServicePointsPage.jsx` and
 * `Level2RoutesPage.jsx` already use — no new endpoint, no data
 * duplication. Read-only: no admin Import/Export/History/Rollback section
 * for this screen.
 */
export default function IntegratedMapPage() {
  const [spStatus, setSpStatus] = useState('loading');
  const [points, setPoints] = useState([]);
  const [spMissingCoordCount, setSpMissingCoordCount] = useState(0);
  const [spErrorMessage, setSpErrorMessage] = useState(null);

  const [routesStatus, setRoutesStatus] = useState('loading');
  const [routes, setRoutes] = useState([]);
  const [routesWarning, setRoutesWarning] = useState(null);
  const [routesErrorMessage, setRoutesErrorMessage] = useState(null);

  const loadServicePoints = useCallback(() => {
    setSpStatus((prev) => (prev === 'ready' ? prev : 'loading'));
    networkMapClient.getServicePoints()
      .then((response) => {
        const all = response?.data || [];
        const withCoords = all.filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number');
        setPoints(withCoords);
        setSpMissingCoordCount(all.length - withCoords.length);
        setSpStatus(all.length === 0 ? 'empty' : 'ready');
      })
      .catch((error) => {
        setSpErrorMessage(error?.message || 'Không thể kết nối API Mạng điểm phục vụ.');
        setSpStatus('error');
      });
  }, []);

  const loadLevel2Routes = useCallback(() => {
    setRoutesStatus((prev) => (prev === 'ready' ? prev : 'loading'));
    networkMapClient.getLevel2Routes()
      .then((response) => {
        const data = response?.data || [];
        const routesMissingGeometry = data.filter(
          (r) => (r.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number').length < 2,
        ).length;
        setRoutesWarning(routesMissingGeometry > 0 ? `${routesMissingGeometry} tuyến thiếu đủ tọa độ để vẽ đường, chỉ hiển thị trong danh sách.` : null);
        setRoutes(data);
        setRoutesStatus(data.length === 0 ? 'empty' : 'ready');
      })
      .catch((error) => {
        setRoutesErrorMessage(error?.message || 'Không thể kết nối API Mạng đường thư cấp 2.');
        setRoutesStatus('error');
      });
  }, []);

  useEffect(() => { loadServicePoints(); }, [loadServicePoints]);
  useEffect(() => { loadLevel2Routes(); }, [loadLevel2Routes]);

  // The combined map renders once at least one dataset has settled (ready or
  // empty) — each layer surfaces its own loading/error/empty state below and
  // via its own toggle in the sidebar, matching how the two source pages
  // each own their own state independently.
  const bothSettled = spStatus !== 'loading' && routesStatus !== 'loading';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-vnpost-blue-dark">Bản đồ tích hợp</h1>
          <p className="text-gray-600 mt-1">
            Mạng điểm phục vụ + Mạng đường thư cấp 2 — {points.length} điểm, {routes.length} hành trình. Chỉ đọc, dữ liệu trực tiếp từ hai module gốc.
          </p>
        </div>
      </div>

      {spStatus === 'error' && (
        <div className="mb-4">
          <MapStateBanner status="error" errorMessage={spErrorMessage} />
        </div>
      )}
      {routesStatus === 'error' && (
        <div className="mb-4">
          <MapStateBanner status="error" errorMessage={routesErrorMessage} />
        </div>
      )}
      {spStatus === 'empty' && routesStatus === 'empty' && (
        <div className="mb-4">
          <MapStateBanner status="empty" emptyMessage="Chưa có dữ liệu điểm phục vụ hoặc đường thư cấp 2 trong hệ thống." />
        </div>
      )}

      {!bothSettled && (
        <div className="mb-4">
          <MapStateBanner status="loading" />
        </div>
      )}

      {bothSettled && spStatus !== 'error' && routesStatus !== 'error' && !(spStatus === 'empty' && routesStatus === 'empty') && (
        <IntegratedMap
          points={points}
          routes={routes}
          spMissingCoordCount={spMissingCoordCount}
          routesWarning={routesWarning}
        />
      )}
    </div>
  );
}
