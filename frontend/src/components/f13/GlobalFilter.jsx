import { Filter, Calendar } from 'lucide-react';

export default function GlobalFilter({ filters, onChange }) {
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
                    <option value="PhuLoc">Phú Lộc</option>
                    <option value="HuongThuy">Hương Thủy</option>
                    <option value="HuongTra">Hương Trà</option>
                    {/* Fake list for now as we don't have BCVH dict API */}
                </select>
            </div>
        </div>
    );
}
