/**
 * UploadWidget.jsx — TD § 2.2 API 1 Frontend
 *
 * Endpoint: POST /api/f13/upload (TD § 2.2 API 1)
 * Request : multipart/form-data, field: 'file', filename: F1.3-YYYY.MM.DD.xlsx
 * Response: { success, total, inserted, skipped, errors }
 *
 * Special case — 409 Conflict (TD § 2.3 / importController.js):
 *   requiresConfirmation = true  → Hiển thị dialog xác nhận ghi đè.
 *   User xác nhận → gửi lại với ?force=true.
 *
 * Record Classification (data_blueprint.md § 6 / DCR-001):
 *   total    = inserted + skipped + errors
 *   skipped  = duplicate (INSERT OR IGNORE)
 *   errors   = lỗi thực sự
 */
import { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/client';

export default function UploadWidget({ onUploadSuccess }) {
    const [file, setFile]         = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult]     = useState(null);   // { type, data, message, isUnsupportedKpi }
    const [confirm, setConfirm]   = useState(null);   // { ngay_do_kiem } when 409
    const [dragOver, setDragOver] = useState(false);
    const [kpi, setKpi]           = useState('F1.3');
    const [source, setSource]     = useState('HUE');
    const inputRef                = useRef(null);

    const selectFile = (f) => {
        if (f && f.name.endsWith('.xlsx')) {
            setFile(f);
            setResult(null);
            setConfirm(null);
        } else if (f) {
            setResult({ type: 'error', message: 'Chỉ chấp nhận file .xlsx' });
        }
    };

    const handleFileChange = (e) => selectFile(e.target.files[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        selectFile(e.dataTransfer.files[0]);
    };

    // Core upload function — reused for first import and force re-import
    const doUpload = async (forceReimport = false) => {
        if (!file) return;
        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('kpi', kpi);
        formData.append('source', source);

        const url = forceReimport ? '/f13/upload?force=true' : '/f13/upload';

        try {
            const res = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // TD § 2.2 success: { success, total, inserted, skipped, errors, isUnsupportedKpi }
            if (res.data.isUnsupportedKpi) {
                setResult({ type: 'warning', message: res.data.message });
            } else {
                setResult({ type: 'success', data: res.data });
            }
            setConfirm(null);
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
            if (onUploadSuccess) onUploadSuccess();

        } catch (err) {
            const errData = err.response?.data;

            // TD § 2.3 / importController: 409 = date already exists → ask confirmation
            if (err.response?.status === 409 && errData?.requiresConfirmation) {
                setConfirm({ ngay_do_kiem: errData.ngay_do_kiem });
                setResult(null);
            } else {
                setResult({
                    type: 'error',
                    message: errData?.error || err.message || 'Lỗi không xác định'
                });
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UploadCloud size={20} className="text-vnpost-blue" />
                Nạp file {kpi} Excel
            </h2>

            <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Chỉ tiêu (KPI)</label>
                    <select 
                        value={kpi} 
                        onChange={(e) => setKpi(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-vnpost-blue"
                    >
                        <option value="F1.1">F1.1</option>
                        <option value="F1.2">F1.2</option>
                        <option value="F1.3">F1.3</option>
                        <option value="F4.1">F4.1</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Nguồn dữ liệu</label>
                    <select 
                        value={source} 
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-vnpost-blue"
                    >
                        <option value="HUE">Bưu điện TP Huế</option>
                        <option value="TCT">Toàn quốc (TCT)</option>
                    </select>
                </div>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4
                    ${dragOver
                        ? 'border-vnpost-blue bg-blue-50'
                        : file
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-300 hover:border-vnpost-blue hover:bg-blue-50'
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                />
                {file ? (
                    <div className="flex items-center justify-center gap-3 text-green-700">
                        <FileText size={24} />
                        <span className="font-semibold text-sm">{file.name}</span>
                    </div>
                ) : (
                    <div className="text-gray-400">
                        <UploadCloud size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium">Kéo thả hoặc click để chọn file</p>
                        <p className="text-xs mt-1">Định dạng: <code className="bg-gray-100 px-1 rounded">{kpi}-YYYY.MM.DD.xlsx</code></p>
                    </div>
                )}
            </div>

            {/* Upload button */}
            <button
                onClick={() => doUpload(false)}
                disabled={!file || uploading}
                className="w-full py-2.5 bg-vnpost-blue text-white font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
                {uploading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang nạp...</>
                    : <><UploadCloud size={18} />Nạp dữ liệu</>
                }
            </button>

            {/* 409 Re-import confirmation */}
            {confirm && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-amber-800 text-sm">
                                Đã có dữ liệu ngày {confirm.ngay_do_kiem}
                            </p>
                            <p className="text-amber-700 text-xs mt-1">
                                Nạp lại sẽ xóa toàn bộ dữ liệu cũ và thay thế bằng file mới. Xác nhận?
                            </p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => doUpload(true)}
                                    disabled={uploading}
                                    className="px-4 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                >
                                    Xác nhận ghi đè
                                </button>
                                <button
                                    onClick={() => { setConfirm(null); setFile(null); if (inputRef.current) inputRef.current.value = ''; }}
                                    className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Huỷ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success result — DCR-001 Record Classification */}
            {result?.type === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={18} className="text-green-600" />
                        <span className="font-bold text-green-800 text-sm">Nạp dữ liệu thành công</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center mt-2">
                        {[
                            { label: 'Tổng BG', value: result.data.total,    color: 'text-gray-700' },
                            { label: 'Đã nạp',  value: result.data.inserted, color: 'text-green-700' },
                            { label: 'Bỏ qua',  value: result.data.skipped,  color: 'text-amber-600' },
                            { label: 'Lỗi',     value: result.data.errors,   color: 'text-red-600'   },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white rounded-lg p-2 shadow-sm">
                                <p className={`text-lg font-black ${color}`}>{value ?? 0}</p>
                                <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error result */}
            {result?.type === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{result.message}</p>
                </div>
            )}

            {/* Warning result (Unsupported KPI) */}
            {result?.type === 'warning' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-vnpost-blue shrink-0 mt-0.5" />
                    <p className="text-vnpost-blue-dark font-medium text-sm">{result.message}</p>
                </div>
            )}
        </div>
    );
}

