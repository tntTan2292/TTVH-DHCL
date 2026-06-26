/**
 * GlobalFilter — TD § 3.1 Component: TimeFilter + BcvhFilter
 *
 * business_rules.md § 3:
 *   Bộ lọc BCVH: "Tất cả" hoặc "Theo BCVH" (chọn từ danh sách BCVH).
 *   BCVH list được tải động từ API.
 *
 * business_rules.md § 4:
 *   Màu cảnh báo không hardcode — lấy từ Settings Configuration.
 *   (NOT handled here — belongs to BcvhTable/LegendColor).
 */
import { Filter } from 'lucide-react';

export default function GlobalFilter({ filters, onChange, bcvhList = [] }) {
    const handleChange = (e) => {
        onChange({ ...filters, [e.target.name]: e.target.value });
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center mb-6">
            <div className="flex items-center gap-2 text-vnpost-blue-dark font-bold mr-2">
                <Filter size={20} />
                <span>Bộ lọc</span>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">Từ ngày:</span>
                <div className="relative">
                    <input 
                        type="date" 
                        name="fromDate" 
                        value={filters.fromDate}
                        onChange={handleChange}
                        className="pl-3 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-vnpost-orange focus:ring-1 focus:ring-vnpost-orange"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">Đến ngày:</span>
                <div className="relative">
                    <input 
                        type="date" 
                        name="toDate" 
                        value={filters.toDate}
                        onChange={handleChange}
                        className="pl-3 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-vnpost-orange focus:ring-1 focus:ring-vnpost-orange"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500 font-medium">BCVH:</span>
                <select 
                    name="ma_bcvh" 
                    value={filters.ma_bcvh}
                    onChange={handleChange}
                    className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-vnpost-orange focus:ring-1 focus:ring-vnpost-orange bg-white"
                >
                    <option value="all">-- Tất cả BCVH --</option>
                    {bcvhList.map((bcvh) => (
                        <option key={bcvh.ma_bcvh} value={bcvh.ma_bcvh}>
                            {bcvh.ten_bcvh}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

