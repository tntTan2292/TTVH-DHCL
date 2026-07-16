import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, UploadCloud, XCircle } from 'lucide-react';
import api from '../api/client';

export default function UploadWidget({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [dragOver, setDragOver] = useState(false);
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
        formData.append('source', 'HUE');

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UploadCloud size={20} className="text-vnpost-blue" />
                Nạp file dữ liệu ngày
            </h2>

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
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                    dragOver
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
                    onChange={(event) => selectFile(event.target.files[0])}
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
                        <p className="text-sm font-medium">Kéo thả hoặc click để chọn file .xlsx</p>
                    </div>
                )}
            </div>

            <button
                onClick={() => handleUpload(false)}
                disabled={!file || uploading}
                className="w-full py-2.5 bg-vnpost-blue text-white font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
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
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
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
                                    className="px-4 py-2 rounded-lg bg-white border border-amber-200 text-amber-800 text-sm font-semibold hover:bg-amber-100 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpload(true)}
                                    disabled={uploading}
                                    className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                                >
                                    Xác nhận ghi đè
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {result?.type === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={18} className="text-green-600" />
                        <span className="font-bold text-green-800 text-sm">Nạp dữ liệu thành công</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center mt-2">
                        {[
                            { label: 'Tổng BG', value: result.data.total, color: 'text-gray-700' },
                            { label: 'Đã nạp', value: result.data.inserted, color: 'text-green-700' },
                            { label: 'Bỏ qua', value: result.data.skipped, color: 'text-amber-600' },
                            { label: 'Lỗi', value: result.data.errors, color: 'text-red-600' }
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white rounded-lg p-2 shadow-sm">
                                <p className={`text-lg font-black ${color}`}>{value ?? 0}</p>
                                <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {result?.type === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{result.message}</p>
                </div>
            )}
        </div>
    );
}
