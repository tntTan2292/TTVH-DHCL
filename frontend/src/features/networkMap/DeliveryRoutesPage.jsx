import { useCallback, useEffect, useState, useMemo } from 'react';
import networkMapClient from '../../api/NetworkMapClient';
import DeliveryRoutesMap from './DeliveryRoutesMap';
import MapStateBanner from './MapStateBanner';
import CalendarDatePicker from './CalendarDatePicker';
import NetworkAdminSection from './import/NetworkAdminSection';
import FlatImportPanel from './import/FlatImportPanel';
import DeliveryExportPanel from './import/DeliveryExportPanel';

export default function DeliveryRoutesPage() {
  const [metaStatus, setMetaStatus] = useState('loading');
  const [metaError, setMetaError] = useState(null);
  const [dates, setDates] = useState([]);
  const [bcvhOptions, setBcvhOptions] = useState([]);
  const [postmanOptions, setPostmanOptions] = useState([]);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBcvh, setSelectedBcvh] = useState('');
  const [selectedPostman, setSelectedPostman] = useState('');
  const [selectedCa, setSelectedCa] = useState(''); // '' = Tất cả ca, 'sang' = Ca sáng, 'chieu' = Ca chiều

  const [pointsStatus, setPointsStatus] = useState('idle');
  const [points, setPoints] = useState([]);
  const [pointsError, setPointsError] = useState(null);

  // Load global dates list (also re-callable after an admin Import Confirm)
  const loadMeta = useCallback(() => {
    setMetaStatus((prev) => (prev === 'ready' ? prev : 'loading'));
    networkMapClient.getDeliveryRoutesMeta()
      .then((response) => {
        const d = response?.data?.dates || [];
        setDates(d);
        setMetaStatus(d.length === 0 ? 'empty' : 'ready');
      })
      .catch((error) => {
        setMetaError(error?.message || 'Không thể kết nối API Sơ đồ tuyến phát.');
        setMetaStatus('error');
      });
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  // When Date changes via CalendarDatePicker, reset child selections & clear map data
  const handleDateChange = (newDateStr) => {
    setSelectedDate(newDateStr);
    setSelectedBcvh('');
    setSelectedPostman('');
    setSelectedCa('');
    setBcvhOptions([]);
    setPostmanOptions([]);
    setPoints([]);
    setPointsStatus('idle');
  };

  // When Date changes, load BCVH scoped strictly to that date
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

  // When BCVH changes (with Date set), load Postmen scoped strictly to that Date+BCVH
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

  // Only query points once mandatory filters (Date, BCVH, Postman) are selected
  useEffect(() => {
    if (!selectedDate || !selectedBcvh || !selectedPostman) return;

    let cancelled = false;
    setPointsStatus('loading');
    networkMapClient.getDeliveryRoutePoints(selectedDate, selectedBcvh, selectedPostman, selectedCa)
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
  }, [selectedDate, selectedBcvh, selectedPostman, selectedCa]);

  // Calculate detailed ca phát KPIs and time range
  const kpis = useMemo(() => {
    const total = points.length;
    const distinctLocations = new Set(points.map((p) => `${p.lat},${p.lon}`)).size;
    const morningCount = points.filter((p) => p.ca_phat === 'Ca sáng').length;
    const afternoonCount = points.filter((p) => p.ca_phat === 'Ca chiều').length;
    const missingTimeCount = points.filter((p) => !p.thoi_gian_nhap_phat).length;
    const totalCod = points.reduce((acc, p) => acc + (Number(p.tien_thu_ho) || 0), 0);

    const validTimePoints = points.filter((p) => p.thoi_gian_nhap_phat || p.raw_thoi_gian_nhap_phat);
    const earliestTime = validTimePoints.length > 0
      ? (validTimePoints[0].raw_thoi_gian_nhap_phat || validTimePoints[0].thoi_gian_nhap_phat)
      : '—';
    const latestTime = validTimePoints.length > 0
      ? (validTimePoints[validTimePoints.length - 1].raw_thoi_gian_nhap_phat || validTimePoints[validTimePoints.length - 1].thoi_gian_nhap_phat)
      : '—';

    return {
      total,
      distinctLocations,
      morningCount,
      afternoonCount,
      missingTimeCount,
      totalCod,
      earliestTime,
      latestTime,
    };
  }, [points]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-vnpost-blue-dark">Sơ đồ tuyến phát</h1>
          <p className="text-gray-600 mt-1">Truy vấn hành trình theo Bộ chọn ngày Calendar (Thời gian nhập phát) và phân ca (Ca sáng / Ca chiều).</p>
        </div>
      </div>

      <NetworkAdminSection
        module="delivery_route"
        exportSlot={<DeliveryExportPanel />}
        importSlot={(refreshHistory) => (
          <FlatImportPanel
            rowKeyField="key"
            rowLabel="Khóa (bưu gửi/ngày/tuyến)"
            onPreview={(file) => networkMapClient.previewDeliveryRoutes(file)}
            onConfirm={async (sessionToken) => {
              const res = await networkMapClient.confirmDeliveryRoutes(sessionToken);
              loadMeta();
              refreshHistory();
              return res;
            }}
          />
        )}
      />

      {metaStatus !== 'ready' && (
        <div className="mb-4">
          <MapStateBanner status={metaStatus} errorMessage={metaError} emptyMessage="Chưa có dữ liệu tuyến phát trong hệ thống." />
        </div>
      )}

      {metaStatus === 'ready' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ngày phát (nhập phát)</label>
            <CalendarDatePicker
              value={selectedDate}
              onChange={handleDateChange}
              availableDates={dates}
              placeholder="-- Chọn ngày phát --"
              disabled={metaStatus !== 'ready'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">BCVH (MABC_PHAT)</label>
            <select
              className="w-full border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              value={selectedBcvh}
              onChange={(e) => setSelectedBcvh(e.target.value)}
              disabled={!selectedDate}
            >
              <option value="">-- Chọn BCVH --</option>
              {bcvhOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Bưu tá (POSTMAN_CODE)</label>
            <select
              className="w-full border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              value={selectedPostman}
              onChange={(e) => setSelectedPostman(e.target.value)}
              disabled={!selectedBcvh}
            >
              <option value="">-- Chọn bưu tá --</option>
              {postmanOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ca phát (Lọc bổ sung)</label>
            <select
              className="w-full border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              value={selectedCa}
              onChange={(e) => setSelectedCa(e.target.value)}
              disabled={!selectedPostman}
            >
              <option value="">Tất cả ca</option>
              <option value="sang">Ca sáng (00:00 - 14:00)</option>
              <option value="chieu">Ca chiều (sau 14:00)</option>
            </select>
          </div>
        </div>
      )}

      {(!selectedDate || !selectedBcvh || !selectedPostman) && metaStatus === 'ready' && (
        <MapStateBanner status="empty" emptyMessage="Vui lòng chọn đủ Ngày phát, BCVH và Bưu tá để hiển thị Sơ đồ tuyến phát." />
      )}

      {selectedDate && selectedBcvh && selectedPostman && pointsStatus !== 'ready' && (
        <MapStateBanner status={pointsStatus === 'idle' ? 'loading' : pointsStatus} errorMessage={pointsError} emptyMessage="Không tìm thấy bưu gửi nào cho lựa chọn này." />
      )}

      {pointsStatus === 'ready' && (
        <div className="space-y-3">
          {/* Warning banner for missing import time if any */}
          {kpis.missingTimeCount > 0 && (
            <div className="px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <span>⚠️ Có <b>{kpis.missingTimeCount}</b> bưu gửi thiếu <b>Thời gian nhập phát</b> (không xếp ca/hành trình thời gian).</span>
            </div>
          )}

          {/* 5 Statistics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-blue-700">Tổng bưu gửi</div>
              <div className="text-lg font-bold text-blue-900 mt-0.5">{kpis.total} <span className="text-xs font-normal">bưu gửi</span></div>
              <div className="text-[10px] text-blue-600 mt-1">COD: {kpis.totalCod.toLocaleString('vi-VN')} đ</div>
            </div>
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-indigo-700">Tọa độ phát thực tế</div>
              <div className="text-lg font-bold text-indigo-900 mt-0.5">{kpis.distinctLocations} <span className="text-xs font-normal">vị trí</span></div>
              <div className="text-[10px] text-indigo-600 mt-1">Đã gộp điểm trùng</div>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-emerald-700">Ca sáng (00:00 - 14:00)</div>
              <div className="text-lg font-bold text-emerald-900 mt-0.5">{kpis.morningCount} <span className="text-xs font-normal">bưu gửi</span></div>
            </div>
            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-purple-700">Ca chiều (sau 14:00)</div>
              <div className="text-lg font-bold text-purple-900 mt-0.5">{kpis.afternoonCount} <span className="text-xs font-normal">bưu gửi</span></div>
            </div>
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-amber-700">Thiếu Thời gian nhập phát</div>
              <div className="text-lg font-bold text-amber-900 mt-0.5">{kpis.missingTimeCount} <span className="text-xs font-normal">bưu gửi</span></div>
            </div>
          </div>

          {/* Time Range Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-gray-700">
            <div>
              <span className="font-semibold text-gray-900">Khung giờ di chuyển (Thời gian nhập phát):</span>{' '}
              <span className="font-bold text-blue-700">{kpis.earliestTime}</span> ➔ <span className="font-bold text-blue-700">{kpis.latestTime}</span>
            </div>
            <div className="text-[11px] text-gray-500">
              BCVH: <b>{selectedBcvh}</b> • Bưu tá: <b>{selectedPostman}</b>
            </div>
          </div>

          {/* Map display */}
          <DeliveryRoutesMap points={points} />
        </div>
      )}
    </div>
  );
}

