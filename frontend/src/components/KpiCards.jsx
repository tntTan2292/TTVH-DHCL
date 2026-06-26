import { Target, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

/**
 * KpiCards — TD § 3.1 Component: KpiCards
 *
 * Hiển thị các chỉ số M1 theo SSOT measurement.md:
 *   - F13_001: KPI F1.3 (Today, Yesterday, DoD, SWC)
 *   - F13_101: Tổng Bưu gửi
 *   - F13_102: Bưu gửi Đạt
 *   - F13_103: Bưu gửi Không đạt
 *   - F13_104: Tỷ lệ Không đạt
 *
 * Format rules (business_rules.md § 5):
 *   - KPI %: 2 chữ số thập phân (toFixed(2) done server-side, display as-is)
 *   - Sản lượng: dấu phân cách hàng nghìn (toLocaleString)
 */

// Format helpers — business_rules.md § 5
const fmtPct = (val) => `${val ?? 0}%`;
const fmtDelta = (val) => `${val > 0 ? '+' : ''}${val ?? 0}%`;
const fmtCount = (val) => (val ?? 0).toLocaleString('vi-VN');

export default function KpiCards({ data }) {
  if (!data) return null;

  const dodPositive = (data.dod ?? 0) >= 0;
  const swcPositive = (data.swc ?? 0) >= 0;

  return (
    <div className="mb-6 space-y-4">
      {/* Row 1: So sánh thời gian — F13_001 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hôm nay</p>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Target size={18} className="text-vnpost-blue" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-800">{fmtPct(data.today)}</p>
          <p className="text-xs text-gray-400 mt-1">KPI F1.3 toàn mạng</p>
        </div>

        {/* Yesterday */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hôm qua</p>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Target size={18} className="text-gray-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-600">{fmtPct(data.yesterday)}</p>
          <p className="text-xs text-gray-400 mt-1">KPI F1.3 toàn mạng</p>
        </div>

        {/* DoD */}
        <div className={`bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow ${dodPositive ? 'border-green-100' : 'border-red-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">DoD</p>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${dodPositive ? 'bg-green-50' : 'bg-red-50'}`}>
              {dodPositive
                ? <TrendingUp size={18} className="text-green-600" />
                : <TrendingDown size={18} className="text-red-600" />}
            </div>
          </div>
          <p className={`text-2xl font-black ${dodPositive ? 'text-green-600' : 'text-red-600'}`}>{fmtDelta(data.dod)}</p>
          <p className="text-xs text-gray-400 mt-1">So hôm qua</p>
        </div>

        {/* SWC */}
        <div className={`bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow ${swcPositive ? 'border-green-100' : 'border-red-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SWC</p>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${swcPositive ? 'bg-green-50' : 'bg-red-50'}`}>
              {swcPositive
                ? <TrendingUp size={18} className="text-green-600" />
                : <TrendingDown size={18} className="text-red-600" />}
            </div>
          </div>
          <p className={`text-2xl font-black ${swcPositive ? 'text-green-600' : 'text-red-600'}`}>{fmtDelta(data.swc)}</p>
          <p className="text-xs text-gray-400 mt-1">So cùng ngày tuần trước</p>
        </div>
      </div>

      {/* Row 2: Sản lượng kỳ — F13_101, F13_102, F13_103, F13_104 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* F13_101: Tổng Bưu gửi */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tổng Bưu gửi</p>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <AlertCircle size={18} className="text-vnpost-blue" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-800">{fmtCount(data.tong_buu_gui)}</p>
          <p className="text-xs text-gray-400 mt-1">F13_101 · kỳ lọc</p>
        </div>

        {/* F13_102: Bưu gửi Đạt */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bưu gửi Đạt</p>
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-green-700">{fmtCount(data.buu_gui_dat)}</p>
          <p className="text-xs text-gray-400 mt-1">F13_102 · kỳ lọc</p>
        </div>

        {/* F13_103: Bưu gửi Không đạt */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Không đạt</p>
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle size={18} className="text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600">{fmtCount(data.buu_gui_khong_dat)}</p>
          <p className="text-xs text-gray-400 mt-1">F13_103 · kỳ lọc</p>
        </div>

        {/* F13_104: Tỷ lệ Không đạt */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tỷ lệ Không đạt</p>
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
              <TrendingDown size={18} className="text-vnpost-orange" />
            </div>
          </div>
          <p className="text-2xl font-black text-vnpost-orange">{fmtPct(data.ty_le_khong_dat)}</p>
          <p className="text-xs text-gray-400 mt-1">F13_104 · kỳ lọc</p>
        </div>
      </div>
    </div>
  );
}

