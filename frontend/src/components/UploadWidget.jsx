import { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/client';

export default function UploadWidget({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    const selectFile = (f) => {
        if (f && f.name.toLowerCase().endsWith('.xlsx')) {
            setFile(f);
            setResult(null);
        } else if (f) {
            setResult({ type: 'error', message: 'Chỉ chấp nhận file .xlsx hợp lệ.' });
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', 'HUE');

        try {
            const res = await api.post('/import/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResult({ type: 'success', data: res.data.data });
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
            onUploadSuccess?.();
        } catch (err) {
            setResult({
                type: 'error',
                message: err.message || 'Nạp dữ liệu thất bại.'
            });
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
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files[0]); }}
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
                    onChange={(e) => selectFile(e.target.files[0])}
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
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full py-2.5 bg-vnpost-blue text-white font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
                {uploading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang nạp...</>
                    : <><UploadCloud size={18} />Nạp dữ liệu</>
                }
            </button>

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

            {result?.type === 'warning' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-vnpost-blue shrink-0 mt-0.5" />
                    <p className="text-vnpost-blue-dark font-medium text-sm">{result.message}</p>
                </div>
            )}
        </div>
    );
}
