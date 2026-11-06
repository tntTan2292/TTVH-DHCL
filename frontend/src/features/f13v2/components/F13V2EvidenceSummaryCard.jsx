import { useRef } from 'react';
import { Target, CheckCircle2, AlertTriangle, Activity, UserCheck, ShieldCheck, Scale } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';
import { formatShortfall } from '../f13WhyHelpers.js';
import { formatAnalystCause } from '../f13EvidenceHelpers.js';

export default function F13V2EvidenceSummaryCard({
  summary = null,
  loading = false,
  onFilterCause,
  onFilterAnalysed,
  onFilterAnalystCause,
}) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  indicatorTheme(indicator);

  if (loading && !summary) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm animate-pulse flex flex-col gap-4">
        <div className="h-6 w-1/3 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const sys = summary?.system || {};
  const total = sys.total || 0;
  const passed = sys.passed || 0;
  const failed = sys.failed || 0;
  const rate = sys.rate !== undefined && sys.rate !== null ? sys.rate : (total > 0 ? passed / total : 0);
  const shortfall = sys.shortfall || 0;
  const causes = summary?.causes || {};

  const analysed = summary?.analysed || 0;
  const analysedMix = summary?.analysed_mix || {};
  const sameAsSystem = analysedMix.same_as_system || 0;
  const diffFromSystem = analysedMix.different_from_system || 0;
  const noSystemCause = analysedMix.no_system_cause || 0;
  const byCause = analysedMix.by_cause || {};

  const completionRate = failed > 0 ? analysed / failed : 0;

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-[box-shadow,border-color] duration-150 flex flex-col gap-4"
    >
      {/* Block Header with camera capture */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Tổng quan Chất lượng & Phân tích Minh chứng
            </h2>
            <p className="text-xs text-slate-500">
              Số liệu hệ thống kết hợp kết quả phân tích độc lập của Chuyên quản (PO Decision V2)
            </p>
          </div>
        </div>

        <BlockCaptureButton
          targetRef={cardRef}
          title="Tong_quan_minh_chung_F13"
          ariaLabel="Chụp ảnh khối tổng quan minh chứng"
        />
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total volume */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Sản lượng đo kiểm</span>
            <Target className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {total.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Toàn bộ bưu gửi F1.3 trong kỳ
          </div>
        </div>

        {/* Passed & Rate */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
            <span>Bưu gửi Đạt</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-950">
            {passed.toLocaleString('vi-VN')}
            <span className="text-sm font-bold text-emerald-800 ml-1.5">
              ({(rate * 100).toFixed(2)}%)
            </span>
          </div>
          <div className="text-[11px] text-emerald-800 mt-0.5">
            Chỉ tiêu: ≥ 90,0%
          </div>
        </div>

        {/* Failed */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 mb-1">
            <span>Không đạt</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-rose-950">
            {failed.toLocaleString('vi-VN')}
            <span className="text-sm font-bold text-rose-800 ml-1.5">
              ({total > 0 ? ((failed / total) * 100).toFixed(2) : '0,00'}%)
            </span>
          </div>
          <div className="text-[11px] text-rose-800 mt-0.5">
            Cần rà soát và khắc phục
          </div>
        </div>

        {/* Shortfall or Chuyên quản Progress */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-800 mb-1">
            <span>Tiến độ phân tích CQ</span>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-950">
            {analysed.toLocaleString('vi-VN')}
            <span className="text-sm font-bold text-blue-800 ml-1.5">
              / {failed.toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="text-[11px] text-blue-800 mt-0.5">
            Hoàn thành {(completionRate * 100).toFixed(1)}% bưu gửi trượt
          </div>
        </div>
      </div>

      {/* Two Column Grid: System Causes vs Chuyên quản Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        {/* Column 1: System Causes */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Nguyên nhân theo Hệ thống</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              (Bảo toàn nguyên bản theo SSOT)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onFilterCause?.('KHONG_TRON_LO')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer text-left"
            >
              <span className="text-slate-700">Không trọn lô</span>
              <span className="font-bold text-slate-900">{causes.khong_tron_lo || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => onFilterCause?.('KHAI_THAC')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer text-left"
            >
              <span className="text-slate-700">Khai thác quá hạn</span>
              <span className="font-bold text-slate-900">{causes.khai_thac || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => onFilterCause?.('VAN_CHUYEN')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer text-left"
            >
              <span className="text-slate-700">Vận chuyển quá hạn</span>
              <span className="font-bold text-slate-900">{causes.van_chuyen || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => onFilterCause?.('CHUA_PHAN_BIET')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer text-left"
            >
              <span className="text-slate-700">KT-VC chưa phân biệt</span>
              <span className="font-bold text-slate-900">{causes.chua_phan_biet || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => onFilterCause?.('PHAT_CHAM_GIAO_BT')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer text-left"
            >
              <span className="text-slate-700">Chậm giao bưu tá</span>
              <span className="font-bold text-slate-900">{causes.phat_cham_giao_bt || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => onFilterCause?.('PHAT_MUON')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer text-left"
            >
              <span className="text-slate-700">Phát chậm sau khi giao</span>
              <span className="font-bold text-slate-900">{causes.phat_muon || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => onFilterCause?.('PHAT_CHUA_RO')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer text-left"
            >
              <span className="text-slate-700">Phát chưa rõ chi tiết</span>
              <span className="font-bold text-slate-900">{causes.phat_chua_ro || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => onFilterCause?.('CHO_CHUYEN_QUAN')}
              className="flex items-center justify-between p-2 rounded-lg bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100/60 transition-colors cursor-pointer text-left"
            >
              <span className="font-semibold text-amber-900">Chờ Chuyên quản</span>
              <span className="font-extrabold text-amber-950">{causes.cho_chuyen_quan || 0}</span>
            </button>
          </div>
        </div>

        {/* Column 2: Chuyên quản Analysis Review */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Scale className="h-4 w-4 text-emerald-600" />
              <span>Kết quả rà soát của Chuyên quản</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              (Ghi nhận thực tế tại BCVH)
            </span>
          </div>

          {/* Breakdown comparison badges */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onFilterAnalysed?.('yes')}
              className="flex flex-col p-2 rounded-lg bg-emerald-50/60 border border-emerald-200/70 hover:bg-emerald-100/50 transition-colors cursor-pointer text-left"
            >
              <span className="text-[11px] font-medium text-emerald-800">Trùng khớp HT</span>
              <span className="text-base font-extrabold text-emerald-950 mt-0.5">
                {sameAsSystem.toLocaleString('vi-VN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onFilterAnalysed?.('yes')}
              className="flex flex-col p-2 rounded-lg bg-amber-50/60 border border-amber-200/70 hover:bg-amber-100/50 transition-colors cursor-pointer text-left"
            >
              <span className="text-[11px] font-medium text-amber-800">Khác kết luận HT</span>
              <span className="text-base font-extrabold text-amber-950 mt-0.5">
                {diffFromSystem.toLocaleString('vi-VN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onFilterAnalysed?.('yes')}
              className="flex flex-col p-2 rounded-lg bg-blue-50/60 border border-blue-200/70 hover:bg-blue-100/50 transition-colors cursor-pointer text-left"
            >
              <span className="text-[11px] font-medium text-blue-800">Chưa có KL HT</span>
              <span className="text-base font-extrabold text-blue-950 mt-0.5">
                {noSystemCause.toLocaleString('vi-VN')}
              </span>
            </button>
          </div>

          {/* Causes chosen by Chuyên quản */}
          <div className="mt-1 pt-2 border-t border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
              Cơ cấu nguyên nhân Chuyên quản đã kết luận:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(byCause).length > 0 ? (
                Object.entries(byCause).map(([cCode, count]) => (
                  <button
                    key={cCode}
                    type="button"
                    onClick={() => onFilterAnalystCause?.(cCode)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <span>{formatAnalystCause(cCode)}:</span>
                    <span className="font-bold text-slate-900">{count}</span>
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Chưa có bưu gửi nào được ghi nhận phân tích trong kỳ.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
        <span>
          * Số liệu hệ thống được bảo toàn độc lập (PO Decision V2). Đánh giá của Chuyên quản phục vụ rà soát thực tế và làm cơ sở hoàn thiện bộ quy tắc.
        </span>
        {shortfall > 0 && (
          <span className="font-semibold text-rose-600">
            Cần thêm {formatShortfall(shortfall)} bưu gửi Đạt để đạt mốc 90%
          </span>
        )}
      </div>
    </div>
  );
}
