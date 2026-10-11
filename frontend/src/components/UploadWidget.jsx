import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, UploadCloud, XCircle } from 'lucide-react';
import api from '../api/client';

export default function UploadWidget({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [indicator, setIndicator] = useState('F1.3');
    const [source, setSource] = useState('HUE');
    const inputRef = useRef(null);

    const getErrorMessage = (err) => (
        err.response?.data?.error?.message
        || err.response?.data?.message
        || err.message
        || 'Nạp dữ liệu thất bại.'
    );

    const selectFile = (selectedFile) => {
        if (selectedFile && selectedFile.name.toLowerCase().endsWith('.xlsx')) {
            setFile(selectedFile);
            setResult(null);
            setConfirm(null);
            return;
        }

        if (selectedFile) {
            setResult({ type: 'error', message: 'Chỉ chấp nhận file .xlsx hợp lệ.' });
        }
    };

    const handleUpload = async (forceReimport = false) => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('indicator', indicator);
        formData.append('source', source);

        try {
            const endpoint = forceReimport ? '/import/upload?force=true' : '/import/upload';
            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResult({ type: 'success', data: res.data.data });
            setConfirm(null);
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
            onUploadSuccess?.();
        } catch (err) {
            const data = err.response?.data;
            if (err.response?.status === 409 && data?.requiresConfirmation) {
                setConfirm({ ngay_do_kiem: data.ngay_do_kiem });
                setResult(null);
                return;
            }

            setResult({ type: 'error', message: getErrorMessage(err) });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white/95 rounded-2xl shadow-sm border border-slate-200/90 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UploadCloud size={20} className="text-vnpost-blue" />
                Nạp file dữ liệu ngày
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <label className="text-xs font-semibold text-slate-600">
                    Chỉ tiêu
                    <select
                        value={indicator}
                        onChange={(event) => {
                            setIndicator(event.target.value);
                            setConfirm(null);
                            setResult(null);
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition-colors focus:border-vnpost-blue focus:outline-hidden focus:ring-2 focus:ring-vnpost-blue/20"
                    >
                        <option value="F1.3">F1.3</option>
                        <option value="F4.1">F4.1</option>
                        <option value="F1.1">F1.1</option>
                        <option value="F1.2">F1.2</option>
                    </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Nguồn
                    <select
                        value={source}
                        onChange={(event) => {
                            setSource(event.target.value);
                            setConfirm(null);
                            setResult(null);
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition-colors focus:border-vnpost-blue focus:outline-hidden focus:ring-2 focus:ring-vnpost-blue/20"
                    >
                        <option value="HUE">HUE</option>
                        <option value="TCT">TCT</option>
                    </select>
                </label>
            </div>

            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragOver(false);
                    selectFile(event.dataTransfer.files[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-[border-color,background-color] mb-4 ${
                    dragOver
                        ? 'border-vnpost-blue bg-blue-50/70'
                        : file
                            ? 'border-emerald-400 bg-emerald-50/70'
                            : 'border-slate-300/80 hover:border-vnpost-blue hover:bg-slate-50/70'
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={(event) => selectFile(event.target.files[0])}
                    className="hidden"
                />
                {file ? (
                    <div className="flex items-center justify-center gap-3 text-emerald-700">
                        <FileText size={24} />
                        <span className="font-semibold text-sm">{file.name}</span>
                    </div>
                ) : (
                    <div className="text-slate-400">
                        <UploadCloud size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-medium">Kéo thả hoặc click để chọn file .xlsx</p>
                    </div>
                )}
            </div>

            <button
                onClick={() => handleUpload(false)}
                disabled={!file || uploading}
                className="w-full py-2.5 bg-vnpost-blue text-white font-semibold rounded-xl hover:bg-blue-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-[background-color,transform] flex items-center justify-center gap-2 focus:outline-hidden focus:ring-2 focus:ring-vnpost-blue/30"
            >
                {uploading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang nạp...
                    </>
                ) : (
                    <>
                        <UploadCloud size={18} />
                        Nạp dữ liệu
                    </>
                )}
            </button>

            {confirm && (
                <div className="mt-4 p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-900">
                                Dữ liệu ngày {confirm.ngay_do_kiem} đã tồn tại.
                            </p>
                            <p className="text-sm text-amber-800 mt-1">
                                Bạn có muốn ghi đè dữ liệu cũ và import lại không?
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirm(null)}
                                    disabled={uploading}
                                    className="px-4 py-2 rounded-lg bg-white border border-amber-200 text-amber-800 text-sm font-semibold hover:bg-amber-100 active:scale-[0.98] transition-[background-color,transform] disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpload(true)}
                                    disabled={uploading}
                                    className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 active:scale-[0.98] transition-[background-color,transform] disabled:opacity-50"
                                >
                                    Xác nhận ghi đè
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {result?.type === 'success' && (
                <div className="mt-4 p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span className="font-bold text-emerald-800 text-sm">Nạp dữ liệu thành công</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center mt-2">
                        {[
                            { label: 'Tổng BG', value: result.data.total, color: 'text-slate-700' },
                            { label: 'Đã nạp', value: result.data.inserted, color: 'text-emerald-700' },
                            { label: 'Bỏ qua', value: result.data.skipped, color: 'text-amber-600' },
                            { label: 'Lỗi', value: result.data.errors, color: 'text-rose-600' }
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/95 rounded-lg p-2 shadow-2xs border border-emerald-100/60">
                                <p className={`text-lg font-black ${color}`}>{value ?? 0}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {result?.type === 'error' && (
                <div className="mt-4 p-4 bg-rose-50/80 border border-rose-200/90 rounded-xl flex items-start gap-3">
                    <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-rose-700 text-sm">{result.message}</p>
                </div>
            )}
        </div>
    );
}
