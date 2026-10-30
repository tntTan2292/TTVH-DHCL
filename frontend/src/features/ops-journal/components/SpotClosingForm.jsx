import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Clock, BookOpen, AlertTriangle } from 'lucide-react';
import { validateClosingInput } from '../opsJournalHelpers.js';

export default function SpotClosingForm({
  spot,
  closing = null,
  onSaveClosing,
  saving = false,
  isClosed = false,
}) {
  const [resolved, setResolved] = useState(closing?.resolved ?? null);
  const [recovered, setRecovered] = useState(closing?.recovered ?? null);
  const [handlingTimeText, setHandlingTimeText] = useState(closing?.handlingTimeText || '');
  const [lesson, setLesson] = useState(closing?.lesson || '');
  const [processUpdate, setProcessUpdate] = useState(closing?.processUpdate || '');
  const [doneTime, setDoneTime] = useState(closing?.doneTime || '');
  const [isDirty, setIsDirty] = useState(false);
  const [localError, setLocalError] = useState('');

  // Sync state when spot.closing changes, but DO NOT overwrite if user has unsaved edits (M2)
  useEffect(() => {
    if (!isDirty) {
      if (closing) {
        setResolved(closing.resolved ?? null);
        setRecovered(closing.recovered ?? null);
        setHandlingTimeText(closing.handlingTimeText || '');
        setLesson(closing.lesson || '');
        setProcessUpdate(closing.processUpdate || '');
        setDoneTime(closing.doneTime || '');
      } else {
        setResolved(null);
        setRecovered(null);
        setHandlingTimeText('');
        setLesson('');
        setProcessUpdate('');
        setDoneTime('');
      }
    }
  }, [closing, isDirty]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const payload = {
      resolved,
      recovered,
      handlingTimeText: handlingTimeText.trim(),
      lesson: lesson.trim(),
      processUpdate: processUpdate.trim(),
      doneTime: doneTime.trim() || '',
    };

    const validation = validateClosingInput(payload);
    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }

    const success = await onSaveClosing(spot.id, payload);
    if (success) {
      setIsDirty(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-slate-700" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Kết quả cuối ngày (Giám đốc TTVH)
          </h4>
        </div>
        {closing && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 size={12} />
            Đã lưu kết quả
          </span>
        )}
      </div>

      {localError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-800">
          <AlertTriangle size={14} className="shrink-0 text-rose-600" />
          <span>{localError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Resolved Radio Group */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. Tiến độ xử lý điểm đen <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-800">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`resolved_${spot.id}`}
                  checked={resolved === true}
                  onChange={() => { setResolved(true); setIsDirty(true); }}
                  disabled={isClosed}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Đã giải quyết xong</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`resolved_${spot.id}`}
                  checked={resolved === false}
                  onChange={() => { setResolved(false); setIsDirty(true); }}
                  disabled={isClosed}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Chưa giải quyết xong</span>
              </label>
            </div>
          </div>

          {/* Recovered Radio Group */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              2. Phục hồi chỉ tiêu <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-800">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`recovered_${spot.id}`}
                  checked={recovered === true}
                  onChange={() => { setRecovered(true); setIsDirty(true); }}
                  disabled={isClosed}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Đã phục hồi đạt ngưỡng</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`recovered_${spot.id}`}
                  checked={recovered === false}
                  onChange={() => { setRecovered(false); setIsDirty(true); }}
                  disabled={isClosed}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Chưa phục hồi</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Thời gian xử lý */}
          <div>
            <label htmlFor={`time_${spot.id}`} className="block text-xs font-bold text-slate-700 mb-1">
              Thời gian xử lý
            </label>
            <input
              id={`time_${spot.id}`}
              type="text"
              placeholder="VD: 2 giờ, 1 ca, trong ngày..."
              value={handlingTimeText}
              onChange={(e) => { setHandlingTimeText(e.target.value); setIsDirty(true); }}
              disabled={isClosed}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          {/* Giờ hoàn thành */}
          <div>
            <label htmlFor={`doneTime_${spot.id}`} className="block text-xs font-bold text-slate-700 mb-1">
              Giờ hoàn thành
            </label>
            <div className="relative">
              <input
                id={`doneTime_${spot.id}`}
                type="text"
                placeholder="VD: 17:00, 16:30..."
                value={doneTime}
                onChange={(e) => { setDoneTime(e.target.value); setIsDirty(true); }}
                disabled={isClosed}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
              />
              <Clock size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Bài học kinh nghiệm */}
        <div>
          <label htmlFor={`lesson_${spot.id}`} className="block text-xs font-bold text-slate-700 mb-1">
            Bài học kinh nghiệm rút ra
          </label>
          <textarea
            id={`lesson_${spot.id}`}
            rows={2}
            placeholder="Ghi nhận bài học kinh nghiệm trong công tác điều hành hoặc phối hợp..."
            value={lesson}
            onChange={(e) => { setLesson(e.target.value); setIsDirty(true); }}
            disabled={isClosed}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
          />
        </div>

        {/* Quy trình cần cập nhật */}
        <div>
          <label htmlFor={`proc_${spot.id}`} className="block text-xs font-bold text-slate-700 mb-1">
            Quy trình cần cập nhật / Kiến nghị
          </label>
          <textarea
            id={`proc_${spot.id}`}
            rows={2}
            placeholder="Kiến nghị điều chỉnh giờ chốt ca, luồng xe thư, định biên bưu tá..."
            value={processUpdate}
            onChange={(e) => { setProcessUpdate(e.target.value); setIsDirty(true); }}
            disabled={isClosed}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
          />
        </div>

        {/* Actions */}
        {!isClosed && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              <span>{saving ? 'Đang lưu...' : 'Lưu kết quả cuối ngày'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

