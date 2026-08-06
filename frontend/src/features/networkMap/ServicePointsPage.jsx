import { useCallback, useEffect, useState } from 'react';
import networkMapClient from '../../api/NetworkMapClient';
import ServicePointsMap from './ServicePointsMap';
import MapStateBanner from './MapStateBanner';
import NetworkAdminSection from './import/NetworkAdminSection';
import FlatImportPanel from './import/FlatImportPanel';
import ExportButton from './import/ExportButton';

export default function ServicePointsPage() {
  const [status, setStatus] = useState('loading');
  const [points, setPoints] = useState([]);
  const [missingCoordCount, setMissingCoordCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  const load = useCallback(() => {
    setStatus((prev) => (prev === 'ready' ? prev : 'loading'));
    networkMapClient.getServicePoints()
      .then((response) => {
        const all = response?.data || [];
        const withCoords = all.filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number');
        setPoints(withCoords);
        setMissingCoordCount(all.length - withCoords.length);
        setStatus(all.length === 0 ? 'empty' : 'ready');
      })
      .catch((error) => {
        setErrorMessage(error?.message || 'Không thể kết nối API Mạng điểm phục vụ.');
        setStatus('error');
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-vnpost-blue-dark">Mạng điểm phục vụ</h1>
          <p className="text-gray-600 mt-1">Danh mục điểm phục vụ theo mã điểm — {points.length} điểm hiển thị.</p>
        </div>
      </div>

      <NetworkAdminSection
        module="service_point"
        exportSlot={<ExportButton onExport={() => networkMapClient.exportServicePoints()} label="Export Excel" />}
        importSlot={(refreshHistory) => (
          <FlatImportPanel
            rowKeyField="ma_diem"
            rowLabel="Mã điểm"
            onPreview={(file) => networkMapClient.previewServicePoints(file)}
            onConfirm={async (sessionToken) => {
              const res = await networkMapClient.confirmServicePoints(sessionToken);
              load();
              refreshHistory();
              return res;
            }}
          />
        )}
      />

      {status !== 'ready' && (
        <div className="mb-4">
          <MapStateBanner
            status={status}
            errorMessage={errorMessage}
            emptyMessage="Chưa có dữ liệu điểm phục vụ trong hệ thống."
          />
        </div>
      )}

      {missingCoordCount > 0 && (
        <div className="mb-4">
          <MapStateBanner status="ready" warningMessage={`${missingCoordCount} điểm thiếu tọa độ, không hiển thị trên bản đồ.`} />
        </div>
      )}

      {status === 'ready' && <ServicePointsMap points={points} />}
    </div>
  );
}
