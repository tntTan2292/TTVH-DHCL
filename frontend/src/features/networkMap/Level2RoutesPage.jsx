import { useEffect, useState } from 'react';
import networkMapClient from '../../api/NetworkMapClient';
import Level2RoutesMap from './Level2RoutesMap';
import ImportPendingButton from './ImportPendingButton';
import MapStateBanner from './MapStateBanner';

export default function Level2RoutesPage() {
  const [status, setStatus] = useState('loading');
  const [routes, setRoutes] = useState([]);
  const [warning, setWarning] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    networkMapClient.getLevel2Routes()
      .then((response) => {
        if (cancelled) return;
        const data = response?.data || [];
        const routesMissingGeometry = data.filter((r) => (r.stops || []).filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number').length < 2).length;
        if (routesMissingGeometry > 0) {
          setWarning(`${routesMissingGeometry} tuyến thiếu đủ tọa độ để vẽ đường, chỉ hiển thị trong danh sách.`);
        }
        setRoutes(data);
        setStatus(data.length === 0 ? 'empty' : 'ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(error?.message || 'Không thể kết nối API Mạng đường thư cấp 2.');
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, []);

  const totalKm = routes.reduce((sum, r) => sum + (typeof r.declared_km === 'number' ? r.declared_km : 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-vnpost-blue-dark">Mạng đường thư cấp 2</h1>
          <p className="text-gray-600 mt-1">Mạng hiện hành — {routes.length} hành trình, tổng {totalKm} km. Không dùng phương án tổ chức lại.</p>
        </div>
        <ImportPendingButton />
      </div>

      {status !== 'ready' && (
        <div className="mb-4">
          <MapStateBanner
            status={status}
            errorMessage={errorMessage}
            emptyMessage="Chưa có dữ liệu hành trình đường thư cấp 2 trong hệ thống."
          />
        </div>
      )}

      {warning && (
        <div className="mb-4">
          <MapStateBanner status="ready" warningMessage={warning} />
        </div>
      )}

      {status === 'ready' && (
        <Level2RoutesMap routes={routes} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} />
      )}
    </div>
  );
}
