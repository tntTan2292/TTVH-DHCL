export default function TopListCard({ title, data, type, onRowClick }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-72 flex items-center justify-center">
                <span className="text-gray-400">Không có dữ liệu</span>
            </div>
        );
    }

    const semanticType = title.toLowerCase().includes('tốt nhất') ? 'best' : 'lowest';
    
    const getBadgeColor = (idx) => {
        if (semanticType === 'best') return idx === 0 ? 'bg-emerald-500' : 'bg-emerald-400';
        return idx === 0 ? 'bg-red-500' : 'bg-orange-400';
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{title}</h3>
            <div className="space-y-4">
                {data.map((item, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => onRowClick && onRowClick(item)}
                        className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getBadgeColor(idx)}`}>
                                {idx + 1}
                            </div>
                            <span className="font-semibold text-gray-700 text-sm">{item.ten_bcvh}</span>
                        </div>
                        <div className="text-right">
                            {type === 'lowest' ? (
                                <span className={`font-black ${semanticType === 'best' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {item.kpi_rate}%
                                </span>
                            ) : (
                                <div className="flex flex-col">
                                    <span className="font-black text-orange-600">{item.impact_rate}%</span>
                                    <span className="text-[10px] text-gray-500">{item.fail_count} lỗi</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
