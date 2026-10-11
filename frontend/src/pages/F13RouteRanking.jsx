import { useSearchParams } from 'react-router-dom';

export default function F13RouteRanking() {
    const [searchParams] = useSearchParams();
    const ma_bcvh = searchParams.get('ma_bcvh') || 'Chưa chọn';

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-vnpost-blue-dark">Phân tích tuyến phát - BCVH {ma_bcvh}</h1>
            <p className="text-gray-600 mt-2">Xếp hạng Tuyến phát (Phase 1A Placeholder)</p>
            <div className="mt-8 p-12 bg-white rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
                Dữ liệu phân tích tuyến phát {ma_bcvh !== 'Chưa chọn' && `của ${ma_bcvh}`} sẽ được bổ sung sau.
            </div>
        </div>
    );
}
