import { useEffect, useState } from 'react';
import networkMapClient from '../../api/NetworkMapClient';
import DeliveryRoutesMap from './DeliveryRoutesMap';
import ImportPendingButton from './ImportPendingButton';
import MapStateBanner from './MapStateBanner';

export default function DeliveryRoutesPage() {
  const [metaStatus, setMetaStatus] = useState('loading');
  const [metaError, setMetaError] = useState(null);
  const [dates, setDates] = useState([]);
  const [bcvhOptions, setBcvhOptions] = useState([]);
  const [postmanOptions, setPostmanOptions] = useState([]);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBcvh, setSelectedBcvh] = useState('');
  const [selectedPostman, setSelectedPostman] = useState('');

  const [pointsStatus, setPointsStatus] = useState('idle');
  const [points, setPoints] = useState([]);
  const [pointsError, setPointsError] = useState(null);

  // Load the global Ngày list once.
  useEffect(() => {
    let cancelled = false;
    networkMapClient.getDeliveryRoutesMeta()
      .then((response) => {
        if (cancelled) return;
        const d = response?.data?.dates || [];
        setDates(d);
        setMetaStatus(d.length === 0 ? 'empty' : 'ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setMetaError(error?.message || 'Không thể kết nối API Sơ đồ tuyến phát.');
        setMetaStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  // When Ngày changes, load BCVH scoped to that date.
  useEffect(() => {
    setSelectedBcvh('');
    setSelectedPostman('');
    setBcvhOptions([]);
    setPostmanOptions([]);
    setPoints([]);
    setPointsStatus('idle');
    if (!selectedDate) return;

    let cancelled = false;
    networkMapClient.getDeliveryRoutesMeta(selectedDate)
      .then((response) => {
        if (cancelled) return;
        setBcvhOptions(response?.data?.bcvh || []);
      })
      .catch((error) => {
        if (cancelled) return;
        setMetaError(error?.message || 'Không thể tải danh sách BCVH.');
      });
    return () => { cancelled = true; };
  }, [selectedDate]);

  // When BCVH changes (with Ngày already set), load Bưu tá scoped to both.
  useEffect(() => {
    setSelectedPostman('');
    setPostmanOptions([]);
    setPoints([]);
    setPointsStatus('idle');
    if (!selectedDate || !selectedBcvh) return;

    let cancelled = false;
    networkMapClient.getDeliveryRoutesMeta(selectedDate, selectedBcvh)
      .then((response) => {
        if (cancelled) return;
        setPostmanOptions(response?.data?.postman_codes || []);
      })
      .catch((error) => {
        if (cancelled) return;
        setMetaError(error?.message || 'Không thể tải danh sách Bưu tá.');
      });
    return () => { cancelled = true; };
  }, [selectedDate, selectedBcvh]);

  // Only query points once all three filters are selected.
  useEffect(() => {
    if (!selectedDate || !selectedBcvh || !selectedPostman) return;

    let cancelled = false;
    setPointsStatus('loading');
    networkMapClient.getDeliveryRoutePoints(selectedDate, selectedBcvh, selectedPostman)
      .then((response) => {
        if (cancelled) return;
        const data = response?.data || [];
        setPoints(data);
        setPointsStatus(data.length === 0 ? 'empty' : 'ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setPointsError(error?.message || 'Không thể tải dữ liệu bưu gửi.');
        setPointsStatus('error');
      });
    return () => { cancelled = true; };
  }, [selectedDate, selectedBcvh, selectedPostman]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-vnpost-blue-dark">Sơ đồ tuyến phát</h1>
          <p className="text-gray-600 mt-1">Chỉ truy vấn dữ liệu sau khi chọn đủ Ngày, BCVH và Bưu tá.</p>
        </div>
        <ImportPendingButton />
      </div>

      {metaStatus !== 'ready' && (
        <div className="mb-4">
          <MapStateBanner status={metaStatus} errorMessage={metaError} emptyMessage="Chưa có dữ liệu tuyến phát trong hệ thống." />
        </div>
      )}

      {metaStatus === 'ready' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ngày phát</label>
            <select className="w-full border rounded-lg px-3 py-2" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
              <option value="">-- Chọn ngày --</option>
              {dates.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Bưu cục vận hành (MABC_PHAT)</label>
            <select className="w-full border rounded-lg px-3 py-2" value={selectedBcvh} onChange={(e) => setSelectedBcvh(e.target.value)} disabled={!selectedDate}>
              <option value="">-- Chọn BCVH --</option>
              {bcvhOptions.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Bưu tá (POSTMAN_CODE)</label>
            <select className="w-full border rounded-lg px-3 py-2" value={selectedPostman} onChange={(e) => setSelectedPostman(e.target.value)} disabled={!selectedBcvh}>
              <option value="">-- Chọn bưu tá --</option>
              {postmanOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {(!selectedDate || !selectedBcvh || !selectedPostman) && metaStatus === 'ready' && (
        <MapStateBanner status="empty" emptyMessage="Chọn đủ Ngày, BCVH và Bưu tá để hiển thị bản đồ." />
      )}

      {selectedDate && selectedBcvh && selectedPostman && pointsStatus !== 'ready' && (
        <MapStateBanner status={pointsStatus === 'idle' ? 'loading' : pointsStatus} errorMessage={pointsError} emptyMessage="Không có bưu gửi nào khớp lựa chọn này." />
      )}

      {pointsStatus === 'ready' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-blue-700">Tổng bưu gửi ca phát</div>
              <div className="text-xl font-bold text-blue-900 mt-0.5">{points.length} <span className="text-xs font-normal">bưu gửi</span></div>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-emerald-700">Tổng tiền thu hộ (COD)</div>
              <div className="text-xl font-bold text-emerald-900 mt-0.5">
                {points.reduce((acc, curr) => acc + (Number(curr.tien_thu_ho) || 0), 0).toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span>
              </div>
            </div>
            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-purple-700">Khung giờ di chuyển</div>
              <div className="text-sm font-bold text-purple-900 mt-1">
                {points[0]?.status_time || '—'} ➔ {points[points.length - 1]?.status_time || '—'}
              </div>
            </div>
          </div>
          <DeliveryRoutesMap points={points} />
        </div>
      )}
    </div>
  );
}
