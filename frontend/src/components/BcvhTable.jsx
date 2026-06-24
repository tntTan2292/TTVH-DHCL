import { useNavigate } from 'react-router-dom';

export default function BcvhTable({ data }) {
    const navigate = useNavigate();

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                Không có dữ liệu
            </div>
        );
    }

    const getColorClass = (kpi) => {
        if (kpi >= 70) return 'bg-green-100 text-green-800 font-bold';
        if (kpi >= 60) return 'bg-pink-100 text-pink-800 font-bold';
        if (kpi >= 50) return 'bg-yellow-100 text-yellow-800 font-bold';
        return 'bg-red-100 text-red-800 font-bold';
    };

    const handleRowClick = (ma_bcvh) => {
        navigate(`/f13/route-ranking?ma_bcvh=${ma_bcvh}`);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-bold text-center">XH</th>
                            <th className="px-6 py-4 font-bold">BCVH</th>
                            <th className="px-6 py-4 font-bold text-right">Tổng BG</th>
                            <th className="px-6 py-4 font-bold text-right text-green-600">Đạt</th>
                            <th className="px-6 py-4 font-bold text-right text-red-600">Không đạt</th>
                            <th className="px-6 py-4 font-bold text-center">F1.3</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr 
                                key={row.ma_bcvh} 
                                onClick={() => handleRowClick(row.ma_bcvh)}
                                className="border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-3 text-center text-gray-500 font-medium">
                                    {row.rank}
                                </td>
                                <td className="px-6 py-3 font-semibold text-gray-800 group-hover:text-vnpost-blue transition-colors">
                                    {row.ten_bcvh}
                                </td>
                                <td className="px-6 py-3 text-right font-medium text-gray-600">
                                    {row.total_bg.toLocaleString()}
                                </td>
                                <td className="px-6 py-3 text-right text-green-600 font-medium">
                                    {row.passed_bg.toLocaleString()}
                                </td>
                                <td className="px-6 py-3 text-right text-red-600 font-medium">
                                    {row.failed_bg.toLocaleString()}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs ${getColorClass(row.kpi_rate)}`}>
                                        {row.kpi_rate}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
