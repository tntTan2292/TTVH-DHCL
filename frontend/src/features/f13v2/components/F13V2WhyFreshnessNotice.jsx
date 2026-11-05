import { AlertTriangle, Info } from 'lucide-react';

export default function F13V2WhyFreshnessNotice({ meta }) {
  if (!meta) return null;

  const freshness = meta.freshness;
  const repeats = meta.repeats;

  const isStale = freshness && freshness.complete === false;
  const hasExtraRepeats = repeats && repeats.extra > 0;

  if (!isStale && !hasExtraRepeats) return null;

  return (
    <div className="space-y-2">
      {/* Freshness Alert */}
      {isStale && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Số liệu chưa hoàn tất (chưa phải số liệu chốt)
            </p>
            <p className="text-amber-800">
              {freshness.building_days?.length > 0 && (
                <span>Đang tổng hợp dữ liệu ngày: {freshness.building_days.join(', ')}. </span>
              )}
              {freshness.stale_days?.length > 0 && (
                <span>Các ngày cần đồng bộ lại: {freshness.stale_days.join(', ')}. </span>
              )}
              {freshness.missing_days?.length > 0 && (
                <span>Chưa có dữ liệu ngày: {freshness.missing_days.join(', ')}. </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Multi-day Repeats Info Notice */}
      {hasExtraRepeats && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-900 shadow-xs">
          <Info className="h-4 w-4 shrink-0 text-blue-600" />
          <p>
            Chỉ số chính tính theo <strong>lượt bưu gửi – ngày</strong> ({new Intl.NumberFormat('vi-VN').format(repeats.rows)} lượt, tương ứng {new Intl.NumberFormat('vi-VN').format(repeats.distinct)} bưu gửi duy nhất trong kỳ).
          </p>
        </div>
      )}
    </div>
  );
}
