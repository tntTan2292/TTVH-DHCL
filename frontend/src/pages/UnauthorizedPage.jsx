import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">
                    403
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Không có quyền truy cập</h1>
                <p className="text-sm text-slate-500 mt-2">
                    Tài khoản hiện tại chưa được cấp quyền cho khu vực này.
                </p>
                <Link
                    to="/login"
                    className="inline-flex mt-6 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold hover:bg-blue-700"
                >
                    Quay lại Login
                </Link>
            </div>
        </div>
    );
}
