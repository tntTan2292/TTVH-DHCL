import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle } from 'lucide-react';
import { getIndicatorChipStyle } from '../opsJournalHelpers.js';
import { BCVH_BY_CODE } from '../../../auth/accessModel.js';

export default function ManualSpotModal({ isOpen, onClose, onAddSpot }) {
  const [indicator, setIndicator] = useState('F1.1');
  const [officeCode, setOfficeCode] = useState('533140');
  const [customOfficeCode, setCustomOfficeCode] = useState('');
  const [title, setTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalOfficeCode = officeCode === 'OTHER' ? customOfficeCode.trim() : officeCode;
    const finalTitle = title.trim() || (officeCode !== 'OTHER' && BCVH_BY_CODE[officeCode] ? BCVH_BY_CODE[officeCode] : finalOfficeCode);

    if (!finalOfficeCode) {
      setError('Vui lòng chọn hoặc nhập mã đơn vị / bưu cục.');
      return;
    }
    if (!headline.trim()) {
      setError('Vui lòng nhập nhận định điểm đen (headline).');
      return;
    }

    onAddSpot({
      indicator,
      officeCode: finalOfficeCode,
      title: finalTitle,
      headline: headline.trim(),
    });

    // Reset and close
    setTitle('');
    setHeadline('');
    setError('');
    onClose();
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-[var(--color-vnpost-orange)]" />
            <h3 className="text-base font-bold text-slate-900">Thêm điểm đen thủ công</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chỉ tiêu chất lượng</label>
            <div className="grid grid-cols-5 gap-2">
              {['F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON'].map((ind) => {
                const chip = getIndicatorChipStyle(ind);
                const isSelected = indicator === ind;
                return (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setIndicator(ind)}
                    className={`rounded-lg py-1.5 px-2 text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? `${chip.badgeClass} ring-2 ring-offset-1 ring-blue-500 font-extrabold shadow-xs`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${chip.dotClass}`} />
                    <span>{chip.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị / Bưu cục</label>
            <select
              value={officeCode}
              onChange={(e) => setOfficeCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {Object.entries(BCVH_BY_CODE).map(([code, name]) => (
                <option key={code} value={code}>
                  {code} - {name}
                </option>
              ))}
              <option value="530100">530100 - Bưu cục Giao dịch TP Huế</option>
              <option value="531120">531120 - Bưu cục Khách hàng lớn</option>
              <option value="OTHER">Đơn vị / Tuyến khác (nhập thủ công)</option>
            </select>
            {officeCode === 'OTHER' && (
              <input
                type="text"
                value={customOfficeCode}
                onChange={(e) => setCustomOfficeCode(e.target.value)}
                placeholder="Nhập mã đơn vị hoặc mã tuyến..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề điểm đen (Tùy chọn)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Tuyến phát 535470-01 hoặc Trục KHL 531120..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhận định chất lượng / Headline <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ví dụ: Chỉ tiêu F1.3 của tuyến 535470-01 ngày 28/10 đạt 72.0% (35 BG, 10 BG không đạt), giảm 18% so với tuần trước..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none resize-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Mẫu câu chuẩn: Chỉ tiêu &lt;F&gt; của &lt;đơn vị&gt; ngày &lt;N-1&gt; đạt &lt;x&gt;% (&lt;n&gt; BG, &lt;k&gt; BG không đạt), giảm &lt;d&gt;% so với tuần trước...
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[var(--color-vnpost-orange)] to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-105 transition-all cursor-pointer"
            >
              Thêm vào danh sách
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
