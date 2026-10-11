import React from 'react';
import { FileText } from 'lucide-react';

export default function ExecutiveDailyBrief({ kpiData }) {
  if (!kpiData) return null;

  const kpiVal = kpiData.today ?? 0;
  const kpiDod = kpiData.dod ?? 0;
  const passed = (kpiData.buu_gui_dat ?? 0).toLocaleString('vi-VN');
  const failed = (kpiData.buu_gui_khong_dat ?? 0).toLocaleString('vi-VN');
  const trendStr = kpiDod > 0 ? 'tăng' : (kpiDod < 0 ? 'giảm' : 'chưa thay đổi');

  return (
    <div className="mb-6 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-5 shadow-sm backdrop-blur-xs">
      <div className="mb-3 flex items-center gap-2">
        <FileText size={18} className="text-[var(--color-vnpost-blue)]" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-vnpost-blue-dark)]">
          Bản tin điều hành nhanh
        </h3>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-slate-800">
        <p>
          <span className="font-bold text-[var(--color-vnpost-blue)]">Tình trạng: </span>
          Tỷ lệ đạt hiện tại là <strong>{kpiVal}%</strong>, <strong>{trendStr} {Math.abs(kpiDod)}%</strong> so với hôm qua.
        </p>
        <p>
          <span className="font-bold text-[var(--color-vnpost-blue)]">Xử lý: </span>
          Đã xử lý đạt <strong>{passed}</strong> bưu gửi; còn <strong>{failed}</strong> bưu gửi không đạt theo dữ liệu đã ghi nhận.
        </p>
        <p>
          <span className="font-bold text-rose-700">Lưu ý: </span>
          Nội dung này chỉ phản ánh số liệu hiện có, không tự suy diễn nguyên nhân hoặc chủ sở hữu.
        </p>
      </div>
    </div>
  );
}
