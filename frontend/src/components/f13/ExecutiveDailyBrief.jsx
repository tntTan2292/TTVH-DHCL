import { FileText } from 'lucide-react';

export default function ExecutiveDailyBrief({ kpiData }) {
  if (!kpiData) return null;

  const kpiVal = kpiData.today ?? 0;
  const kpiDod = kpiData.dod ?? 0;
  const rank = kpiData.rank || 0;
  const rankDod = kpiData.rankDod || 0;
  
  // Tự động sinh nội dung tóm tắt (Mẫu)
  const target = 95; // Giả sử KPI mục tiêu là 95%
  const statusStr = kpiVal >= target ? "ĐẠT MỤC TIÊU" : "CHƯA ĐẠT MỤC TIÊU";
  const trendStr = kpiDod > 0 ? "TĂNG" : (kpiDod < 0 ? "GIẢM" : "ĐI NGANG");
  const rankTrendStr = rankDod < 0 ? `thăng ${Math.abs(rankDod)} bậc` : (rankDod > 0 ? `tụt ${rankDod} bậc` : "giữ nguyên thứ hạng");
  
  const rankDisplayStr = rank > 0 ? `đứng thứ ${rank} (${rankTrendStr})` : `N/A`;

  return (
    <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={18} className="text-vnpost-blue" />
        <h3 className="font-bold text-vnpost-blue-dark text-sm uppercase tracking-wide">
          Bản Tin Điều Hành Nhanh
        </h3>
      </div>
      <div className="text-sm text-gray-800 leading-relaxed space-y-2">
        <p>
          <span className="font-semibold text-vnpost-blue">• Tình trạng:</span> Toàn mạng hiện <strong>{statusStr}</strong> ({kpiVal}%), <strong>{trendStr} {Math.abs(kpiDod)}%</strong> so với hôm qua. Xếp hạng toàn quốc <strong>{rankDisplayStr}</strong>.
        </p>
        <p>
          <span className="font-semibold text-vnpost-blue">• Xử lý:</span> Đã xử lý đạt <strong>{(kpiData.buu_gui_dat ?? 0).toLocaleString('vi-VN')}</strong> bưu gửi. Tuy nhiên vẫn còn <strong>{(kpiData.buu_gui_khong_dat ?? 0).toLocaleString('vi-VN')}</strong> bưu gửi chậm chỉ tiêu.
        </p>
        <p>
          <span className="font-semibold text-red-600">• Yêu cầu:</span> Các đơn vị lập tức rà soát lượng bưu gửi tồn đọng, ưu tiên phát dứt điểm hàng trong ca làm việc để vớt KPI.
        </p>
      </div>
    </div>
  );
}
