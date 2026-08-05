import { useEffect, useState, useMemo } from 'react';
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

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedBcvh, setSelectedBcvh] = useState('');
  const [selectedPostman, setSelectedPostman] = useState('');
  const [selectedCa, setSelectedCa] = useState(''); // '' = Tất cả ca, 'sang' = Ca sáng, 'chieu' = Ca chiều

  const [pointsStatus, setPointsStatus] = useState('idle');
  const [points, setPoints] = useState([]);
  const [pointsError, setPointsError] = useState(null);

  // Load global dates list once
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

  // Derived Year options sorted descending
  const yearsOptions = useMemo(() => {
    const set = new Set();
    (dates || []).forEach((d) => {
      if (typeof d === 'string' && d.length >= 4) {
        set.add(d.slice(0, 4));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [dates]);

  // Derived Month options sorted descending for selected Year
  const monthsOptions = useMemo(() => {
    if (!selectedYear) return [];
    const set = new Set();
    const prefix = `${selectedYear}-`;
    (dates || []).forEach((d) => {
      if (typeof d === 'string' && d.startsWith(prefix) && d.length >= 7) {
        set.add(d.slice(5, 7));
      }
    });
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((m) => ({ value: m, label: `Tháng ${m}` }));
  }, [dates, selectedYear]);

  // Derived Day options sorted descending for selected Year + Month
  const daysOptions = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    const prefix = `${selectedYear}-${selectedMonth}-`;
    const matchingDates = (dates || []).filter(
      (d) => typeof d === 'string' && d.startsWith(prefix)
    );
    matchingDates.sort((a, b) => b.localeCompare(a));

    return matchingDates.map((d) => {
      const parts = d.split('-');
      const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
      return { value: d, label: formatted };
    });
  }, [dates, selectedYear, selectedMonth]);

  // Cascade clearing handlers
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMonth('');
    setSelectedDay('');
    setSelectedBcvh('');
    setSelectedPostman('');
    setSelectedCa('');
    setBcvhOptions([]);
    setPostmanOptions([]);
    setPoints([]);
    setPointsStatus('idle');
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    setSelectedDay('');
    setSelectedBcvh('');
    setSelectedPostman('');
    setSelectedCa('');
    setBcvhOptions([]);
    setPostmanOptions([]);
    setPoints([]);
    setPointsStatus('idle');
  };

  const handleDayChange = (dayVal) => {
    setSelectedDay(dayVal);
    setSelectedBcvh('');
    setSelectedPostman('');
    setSelectedCa('');
    setBcvhOptions([]);
    setPostmanOptions([]);
    setPoints([]);
    setPointsStatus('idle');
  };

  // When Day changes, load BCVH scoped strictly to that day
  useEffect(() => {
    setSelectedBcvh('');
    setSelectedPostman('');
    setBcvhOptions([]);
    setPostmanOptions([]);
    setPoints([]);
    setPointsStatus('idle');
    if (!selectedDay) return;

    let cancelled = false;
    networkMapClient.getDeliveryRoutesMeta(selectedDay)
      .then((response) => {
        if (cancelled) return;
        setBcvhOptions(response?.data?.bcvh || []);
      })
      .catch((error) => {
        if (cancelled) return;
        setMetaError(error?.message || 'Không thể tải danh sách BCVH.');
      });
    return () => { cancelled = true; };
  }, [selectedDay]);

  // When BCVH changes (with Day set), load Postmen scoped strictly to that Day+BCVH
  useEffect(() => {
    setSelectedPostman('');
    setPostmanOptions([]);
    setPoints([]);
    setPointsStatus('idle');
    if (!selectedDay || !selectedBcvh) return;

    let cancelled = false;
    networkMapClient.getDeliveryRoutesMeta(selectedDay, selectedBcvh)
      .then((response) => {
        if (cancelled) return;
        setPostmanOptions(response?.data?.postman_codes || []);
      })
      .catch((error) => {
        if (cancelled) return;
        setMetaError(error?.message || 'Không thể tải danh sách Bưu tá.');
      });
    return () => { cancelled = true; };
  }, [selectedDay, selectedBcvh]);

  // Only query points once all mandatory filters (Year, Month, Day, BCVH, Postman) are selected
  useEffect(() => {
    if (!selectedYear || !selectedMonth || !selectedDay || !selectedBcvh || !selectedPostman) return;

    let cancelled = false;
    setPointsStatus('loading');
    networkMapClient.getDeliveryRoutePoints(selectedDay, selectedBcvh, selectedPostman, selectedCa)
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
  }, [selectedYear, selectedMonth, selectedDay, selectedBcvh, selectedPostman, selectedCa]);

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
          <p className="text-gray-600 mt-1">Truy vấn hành trình theo Bộ lọc ngày phân cấp (Năm → Tháng → Ngày) và phân ca (Ca sáng / Ca chiều).</p>
        </div>
        <ImportPendingButton />
      </div>

      {metaStatus !== 'ready' && (
        <div className="mb-4">
          <MapStateBanner status={metaStatus} errorMessage={metaError} emptyMessage="Chưa có dữ liệu tuyến phát trong hệ thống." />
        </div>
      )}

      {metaStatus === 'ready' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Năm</label>
            <select
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
            >
              <option value="">-- Chọn năm --</option>
              {yearsOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tháng</label>
            <select
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={!selectedYear}
            >
              <option value="">-- Chọn tháng --</option>
              {monthsOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ngày phát (nhập phát)</label>
            <select
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              value={selectedDay}
              onChange={(e) => handleDayChange(e.target.value)}
              disabled={!selectedYear || !selectedMonth}
            >
              <option value="">-- Chọn ngày --</option>
              {daysOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">BCVH (MABC_PHAT)</label>
            <select
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              value={selectedBcvh}
              onChange={(e) => setSelectedBcvh(e.target.value)}
              disabled={!selectedDay}
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
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
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
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
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

      {(!selectedYear || !selectedMonth || !selectedDay || !selectedBcvh || !selectedPostman) && metaStatus === 'ready' && (
        <MapStateBanner status="empty" emptyMessage="Vui lòng chọn đủ Năm, Tháng, Ngày, BCVH và Bưu tá để hiển thị Sơ đồ tuyến phát." />
      )}

      {selectedYear && selectedMonth && selectedDay && selectedBcvh && selectedPostman && pointsStatus !== 'ready' && (
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

