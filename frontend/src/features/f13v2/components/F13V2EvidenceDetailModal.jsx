import { useEffect, useRef } from 'react';
import { X, ExternalLink, CheckCircle2, AlertTriangle, Clock, Layers, ShieldCheck, Tag } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { formatCauseLabel, formatPhatDetail, formatChoChuyenQuanReason } from '../f13WhyHelpers.js';
import { formatMilestoneTitle, formatMilestoneState, formatAnalystCause, formatVersusSystem } from '../f13EvidenceHelpers.js';

export default function F13V2EvidenceDetailModal({
  item = null,
  onClose,
  onOpenAnalysis,
  canWrite = false,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const isFailed = item.danh_gia === 'Không đạt';
  const isPassed = item.danh_gia === 'Đạt';
  const sys = item.system || {};
  const tct = item.tct || {};
  const m = item.milestones || {};
  const anl = item.analysis;

  const milestonesList = [
    { key: 'tms', data: m.tms, defaultSource: 'F1.3' },
    { key: 'depart', data: m.depart, defaultSource: 'F1.1' },
    { key: 'arrive', data: m.arrive, defaultSource: item.a_source === 'BF' ? 'BatchFile' : 'F4.1' },
    { key: 'handover_first', data: m.handover_first, defaultSource: 'F4.2' },
    { key: 'handover_shown', data: m.handover_shown, defaultSource: 'F4.2' },
    { key: 'ptc', data: m.ptc, defaultSource: 'F1.3' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPassed ? 'bg-emerald-100 text-emerald-800' : isFailed ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'}`}>
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 font-mono">
                  {item.ma_bg}
                </h3>
                {isPassed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Đạt
                  </span>
                ) : isFailed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    <AlertTriangle className="h-3 w-3" />
                    Không đạt
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ngày đo: <strong>{item.ngay_do_kiem}</strong> • Đơn vị: <strong>{item.ma_bcvh}</strong> • Tuyến: <strong>{item.ten_tuyen || item.ma_tuyen || '—'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" data-no-capture="true">
            <BlockCaptureButton
              targetRef={modalRef}
              blockTitle={`Minh_chung_${item.ma_bg}`}
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Section 1: Five Milestones Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                Dữ liệu 5 mốc thời gian hành trình & Nguồn gốc
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Trạng thái: <strong>{formatMilestoneState(item.milestones_state)}</strong>
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {milestonesList.map((mItem) => {
                const atTime = mItem.data?.at;
                const source = mItem.data?.source || mItem.defaultSource;
                return (
                  <div key={mItem.key} className="py-2 flex items-center justify-between">
                    <div className="font-medium text-slate-700">
                      {formatMilestoneTitle(mItem.key)}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-semibold ${atTime ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                        {atTime || 'Không có mốc'}
                      </span>
                      {atTime && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {source}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: TCT Measurement Performance */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <span className="font-bold text-slate-800 block mb-2">
              Chỉ tiêu và Thời gian đo kiểm TCT
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Số giờ TCT ghi nhận</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {tct.tct_hours !== null && tct.tct_hours !== undefined ? `${tct.tct_hours}h` : '—'}
                </div>
                {tct.hours_text && (
                  <div className="text-[10px] text-slate-400 truncate">Gốc: {tct.hours_text}</div>
                )}
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Hạn định phát</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {tct.limit_hours !== null && tct.limit_hours !== undefined ? `${tct.limit_hours}h` : '—'}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Giờ tính toán lại</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {tct.recomputed_hours !== null && tct.recomputed_hours !== undefined ? `${tct.recomputed_hours}h` : '—'}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Thời gian còn khi đến</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {tct.remaining_at_arrival_hours !== null && tct.remaining_at_arrival_hours !== undefined ? `${tct.remaining_at_arrival_hours}h` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Conclusions: System vs Chuyên quản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* System */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Kết luận của Hệ thống
              </span>
              <div className="pt-1">
                <div className="text-slate-500 text-[11px]">Nguyên nhân:</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {sys.status === 'CHO_CHUYEN_QUAN'
                    ? 'Chờ Chuyên quản phân tích'
                    : formatCauseLabel(sys.code) || sys.label || 'Chưa xác định'}
                </div>
              </div>
              {sys.detail && (
                <div>
                  <div className="text-slate-500 text-[11px]">Chi tiết:</div>
                  <div className="font-semibold text-slate-800">{formatPhatDetail(sys.detail)}</div>
                </div>
              )}
              {sys.reason && (
                <div>
                  <div className="text-slate-500 text-[11px]">Lý do:</div>
                  <div className="font-semibold text-amber-800">{formatChoChuyenQuanReason(sys.reason)}</div>
                </div>
              )}
              {sys.basis && (
                <div>
                  <div className="text-slate-500 text-[11px]">Căn cứ:</div>
                  <div className="text-slate-600 italic text-[11px]">{sys.basis}</div>
                </div>
              )}
            </div>

            {/* Chuyên quản */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-emerald-600" />
                  Đánh giá của Chuyên quản
                </span>
                {canWrite && item.can_analyse && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onOpenAnalysis?.(item);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    {anl ? 'Chỉnh sửa' : 'Ghi phân tích'}
                  </button>
                )}
              </div>

              {anl ? (
                <div className="space-y-1.5 pt-1">
                  <div>
                    <div className="text-slate-500 text-[11px]">Nguyên nhân chọn:</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {anl.label || formatAnalystCause(anl.cause)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[11px]">Đối chiếu hệ thống:</div>
                    <div className="font-semibold text-slate-800">{formatVersusSystem(anl.versus_system)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[11px]">Người ghi:</div>
                    <div className="text-slate-700">
                      <strong>{anl.by}</strong> {anl.position && `(${anl.position})`} • {anl.at}
                    </div>
                  </div>
                  {anl.note && (
                    <div>
                      <div className="text-slate-500 text-[11px]">Ghi chú:</div>
                      <div className="text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        &quot;{anl.note}&quot;
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-slate-400 italic">
                  Chưa có phân tích nào cho bưu gửi này.
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Data Flags & Hints */}
          {((item.flags && item.flags.length > 0) || (item.hints && item.hints.length > 0)) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 space-y-1.5">
              <span className="font-bold text-slate-700 block text-[11px]">
                Cờ dữ liệu & Gợi ý nghiệp vụ
              </span>
              <div className="flex flex-wrap gap-1.5">
                {item.flags?.map((flag) => (
                  <span key={flag} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                    Cờ: {flag}
                  </span>
                ))}
                {item.hints?.map((hint) => (
                  <span key={hint} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    Gợi ý: {hint}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between" data-no-capture="true">
          <a
            href={`/f13/v2/hanh-trinh?date=${item.ngay_do_kiem}&search=${item.ma_bg}&bcvh=${item.ma_bcvh}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            <span>Mở trong Hành trình bưu gửi</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex items-center gap-2">
            {canWrite && item.can_analyse && (
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onOpenAnalysis?.(item);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors cursor-pointer text-xs"
              >
                {anl ? 'Chỉnh sửa phân tích' : 'Ghi phân tích'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
