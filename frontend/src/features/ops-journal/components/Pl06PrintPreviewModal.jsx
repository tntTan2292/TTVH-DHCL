import React from 'react';
import { Printer, Download, FileText, X } from 'lucide-react';
import { buildPl06PrintModel, generatePl06FileName } from '../opsJournalHelpers.js';

export default function Pl06PrintPreviewModal({
  isOpen,
  onClose,
  spot,
  onExport,
  exportingFormat = null,
}) {
  if (!isOpen || !spot) return null;

  const model = buildPl06PrintModel(spot);
  const closing = spot.closing || spot.closingDraft;
  const actions = model?.actions || [];

  const handlePrint = () => {
    if (typeof globalThis.print === 'function') {
      globalThis.print();
    }
  };

  const channelBox = (name) => (model.channel && model.channel === name ? '☒' : '☐');
  const shiftBox = (idx) => (model.shift === idx ? '☒' : '☐');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      {/* Container */}
      <div className="relative flex flex-col w-full max-w-4xl max-h-[95vh] rounded-2xl bg-slate-100 shadow-2xl overflow-hidden my-auto border border-slate-200">
        {/* Modal Toolbar (hidden on print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Bản xem trước in ấn PL06: {generatePl06FileName(spot)}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="In bản ghi ra máy in hoặc lưu PDF hệ thống"
            >
              <Printer size={14} className="text-slate-600" />
              <span>In bản ghi</span>
            </button>

            {/* Download Word */}
            <button
              type="button"
              onClick={() => onExport(spot.id, 'docx')}
              disabled={exportingFormat === 'docx'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Tải văn bản Word .docx theo mẫu PL06"
            >
              <Download size={14} />
              <span>{exportingFormat === 'docx' ? 'Đang tạo...' : 'Tải Word'}</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={() => onExport(spot.id, 'pdf')}
              disabled={exportingFormat === 'pdf'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Tải văn bản PDF theo mẫu PL06"
            >
              <Download size={14} />
              <span>{exportingFormat === 'pdf' ? 'Đang tạo...' : 'Tải PDF'}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer ml-1"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scroll Area containing A4 Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible">
          {/* A4 Sheet Container */}
          <div
            id="pl06-printable-area"
            className="pl06-print-sheet w-full max-w-[210mm] bg-white p-6 sm:p-10 shadow-md text-slate-900 border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Header section */}
            <div className="text-center mb-4">
              <div className="flex justify-between items-start text-[10px] text-slate-500 font-bold uppercase mb-1">
                <span>BƯU ĐIỆN VIỆT NAM — BƯU ĐIỆN THÀNH PHỐ HUẾ</span>
                <span className="text-blue-900 font-black">PHỤ LỤC 06</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-[#1F3864] tracking-tight uppercase mb-0.5">
                {model.title}
              </h1>
              <p className="text-xs text-slate-600 italic font-semibold">
                {model.subtitle}
              </p>
            </div>

            {/* Metadata lines */}
            <div className="border-t border-b border-slate-300 py-2 my-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <strong>Ngày:</strong> {model.dateText}
              </div>
              <div>
                <strong>Người ghi nhận:</strong> {model.signerName} ({model.signerPosition})
              </div>
              <div>
                <strong>Ca:</strong> {shiftBox(0)} Sáng &nbsp;&nbsp; {shiftBox(1)} Chiều &nbsp;&nbsp; {shiftBox(2)} Đêm
              </div>
            </div>

            {/* Section 1: Điểm nghẽn hôm nay */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-black text-[#1F3864] uppercase tracking-wide">
                  1. ĐIỂM NGHẼN HÔM NAY <span className="text-[10px] font-normal text-slate-500">⏱ 2 phút</span>
                </h2>
              </div>
              <table className="w-full border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-[#FBE5D6] text-slate-800">
                    <th className="border border-slate-400 p-1.5 text-left w-3/5 font-bold">Nghẽn ở đâu?</th>
                    <th className="border border-slate-400 p-1.5 text-center w-1/5 font-bold">Phát hiện lúc</th>
                    <th className="border border-slate-400 p-1.5 text-center w-1/5 font-bold">Qua kênh nào?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2 font-medium">
                      <div className="font-bold text-slate-900 mb-0.5">{model.spotTitle}</div>
                      <div className="text-[11px] text-slate-700 italic">{model.headline}</div>
                    </td>
                    <td className="border border-slate-400 p-2 text-center align-top font-semibold">
                      {model.detectedAt
                        ? model.detectedAt.includes(' ')
                          ? model.detectedAt.split(' ')[1]?.slice(0, 5)
                          : model.detectedAt
                        : '................'}
                    </td>
                    <td className="border border-slate-400 p-2 text-center align-top text-[11px]">
                      <div>{channelBox('Dashboard')} Dashboard</div>
                      <div>{channelBox('Hiện trường')} Hiện trường</div>
                      <div>{channelBox('Báo cáo / Điện thoại')} Báo cáo / ĐT</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: Quyết định xử lý — Nguyên tắc 6 rõ */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-black text-[#1F3864] uppercase tracking-wide">
                  2. QUYẾT ĐỊNH XỬ LÝ — NGUYÊN TẮC 6 RÕ <span className="text-[10px] font-normal text-slate-500">⏱ 5 phút</span>
                </h2>
              </div>
              <p className="text-[10px] italic text-slate-600 mb-1">
                * Mỗi quyết định điều xe, điều người, xử lý sự cố đều phải chốt đủ 6 cột dưới đây — không chốt việc mà thiếu rõ.
              </p>
              <table className="w-full border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-[#DCE6F1] text-slate-900 text-center font-bold">
                    <th className="border border-slate-400 p-1 w-8">STT</th>
                    <th className="border border-slate-400 p-1.5 w-1/6">
                      AI<br /><small className="font-normal text-[10px] text-slate-600">(rõ người)</small>
                    </th>
                    <th className="border border-slate-400 p-1.5 w-1/4">
                      LÀM GÌ<br /><small className="font-normal text-[10px] text-slate-600">(rõ việc)</small>
                    </th>
                    <th className="border border-slate-400 p-1.5 w-1/6">
                      Ở ĐÂU<br /><small className="font-normal text-[10px] text-slate-600">(địa điểm)</small>
                    </th>
                    <th className="border border-slate-400 p-1.5 w-20">
                      KHI NÀO<br /><small className="font-normal text-[10px] text-slate-600">(thời hạn)</small>
                    </th>
                    <th className="border border-slate-400 p-1.5 w-1/5">
                      BẰNG CÁCH NÀO<br /><small className="font-normal text-[10px] text-slate-600">(cách làm)</small>
                    </th>
                    <th className="border border-slate-400 p-1.5 w-1/5">
                      KẾT QUẢ GÌ<br /><small className="font-normal text-[10px] text-slate-600">(cần đạt)</small>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {actions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-slate-400 p-3 text-center text-slate-500 italic">
                        Chưa có dòng hành động nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    actions.map((act) => (
                      <tr key={act.stt} className="align-top">
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{act.stt}</td>
                        <td className="border border-slate-400 p-1.5 font-semibold text-slate-800">{act.who}</td>
                        <td className="border border-slate-400 p-1.5 text-slate-900">{act.what}</td>
                        <td className="border border-slate-400 p-1.5 text-slate-800">{act.where}</td>
                        <td className="border border-slate-400 p-1.5 text-center text-slate-800">{act.due}</td>
                        <td className="border border-slate-400 p-1.5 text-slate-700 text-[11px]">{act.how}</td>
                        <td className="border border-slate-400 p-1.5 text-slate-700 text-[11px]">{act.expectedResult}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 3: Kết quả thực tế cuối ngày */}
            <div className="mb-4">
              <h2 className="text-xs font-black text-[#1F3864] uppercase tracking-wide mb-1">
                3. KẾT QUẢ THỰC TẾ CUỐI NGÀY <span className="text-[10px] font-normal text-slate-500">⏱ 2 phút</span>
              </h2>
              <div className="border border-slate-400 p-2.5 text-xs space-y-1.5 bg-slate-50/50">
                <div className="flex items-center gap-6">
                  <span>
                    <strong>Sự cố đã giải quyết?</strong> &nbsp;&nbsp;
                    {closing?.resolved === true ? '☒' : '☐'} Rồi &nbsp;&nbsp;&nbsp;&nbsp;
                    {closing?.resolved === false ? '☒' : '☐'} Chưa
                  </span>
                  <span>
                    <strong>Thời gian xử lý:</strong> {closing?.handlingTimeText || '................................................'}
                  </span>
                </div>
                <div>
                  <strong>Đã phục hồi bình thường?</strong> &nbsp;&nbsp;
                  {closing?.recovered === true ? '☒' : '☐'} Rồi &nbsp;&nbsp;&nbsp;&nbsp;
                  {closing?.recovered === false ? '☒' : '☐'} Chưa, đang theo dõi
                </div>
              </div>
            </div>

            {/* Section 4: Bài học rút ra */}
            <div className="mb-6">
              <h2 className="text-xs font-black text-[#1F3864] uppercase tracking-wide mb-1">
                4. BÀI HỌC RÚT RA <span className="text-[10px] font-normal text-slate-500">⏱ 1 phút</span>
              </h2>
              <div className="border border-slate-400 p-2.5 text-xs space-y-2 bg-slate-50/50">
                <div>
                  <strong className="block text-slate-800 mb-0.5">Lần sau xử lý tốt hơn thế nào?</strong>
                  <p className="text-slate-700 italic pl-2 border-l-2 border-blue-400">
                    {closing?.lesson || '......................................................................................................................................................'}
                  </p>
                </div>
                <div>
                  <strong>Quy trình nào cần cập nhật?</strong> &nbsp;&nbsp;
                  {closing ? (closing.processUpdate ? '☐' : '☒') : '☐'} Không &nbsp;&nbsp;&nbsp;&nbsp;
                  {closing?.processUpdate ? '☒' : '☐'} Có: {closing?.processUpdate || '................................................................................................'}
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-300">
              <div>
                <p className="text-[10px] text-slate-500 italic">Tài liệu nội bộ — Lưu hành TTVH</p>
              </div>
              <div className="text-right space-y-1">
                <p>
                  <strong>Người ghi nhận / Ký xác nhận:</strong> {model.signerName || '................................'}
                </p>
                <p className="text-[11px] text-slate-600">
                  <strong>Giờ hoàn thành nhật ký:</strong>{' '}
                  {closing?.doneTime
                    ? closing.doneTime.includes('T')
                      ? closing.doneTime.split('T')[1].slice(0, 5)
                      : closing.doneTime
                    : '................'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded print style to hide extraneous web elements on print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pl06-printable-area, #pl06-printable-area * {
            visibility: visible;
          }
          #pl06-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 12mm 13mm 14mm 13mm;
            border: none !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

