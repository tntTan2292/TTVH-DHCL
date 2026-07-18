import { FileText } from 'lucide-react';

export default function ExecutiveDailyBrief({ kpiData }) {
  if (!kpiData) return null;

  const kpiVal = kpiData.today ?? 0;
  const kpiDod = kpiData.dod ?? 0;
  const passed = (kpiData.buu_gui_dat ?? 0).toLocaleString('vi-VN');
  const failed = (kpiData.buu_gui_khong_dat ?? 0).toLocaleString('vi-VN');
  const trendStr = kpiDod > 0 ? 'tăng' : (kpiDod < 0 ? 'giảm' : 'chưa thay đổi');

  return (
    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FileText size={18} className="text-vnpost-blue" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-vnpost-blue-dark">
          Bản tin điều hành nhanh
        </h3>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-gray-800">
        <p>
          <span className="font-semibold text-vnpost-blue">Tình trạng: </span>
          Tỷ lệ đạt hiện tại là <strong>{kpiVal}%</strong>, <strong>{trendStr} {Math.abs(kpiDod)}%</strong> so với hôm qua.
        </p>
        <p>
          <span className="font-semibold text-vnpost-blue">Xử lý: </span>
          Đã xử lý đạt <strong>{passed}</strong> bưu gửi; còn <strong>{failed}</strong> bưu gửi không đạt theo dữ liệu đã ghi nhận.
        </p>
        <p>
          <span className="font-semibold text-red-700">Lưu ý: </span>
          Nội dung này chỉ phản ánh số liệu hiện có, không tự suy diễn nguyên nhân hoặc chủ sở hữu.
        </p>
      </div>
    </div>
  );
}
