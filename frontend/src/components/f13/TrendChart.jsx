import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrendChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-72 flex items-center justify-center">
                <span className="text-gray-400">Không có dữ liệu</span>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-80">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Xu hướng 30 ngày</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#6B7280'}}
                        tickFormatter={(val) => val.substring(5)} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#6B7280'}}
                        domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`${value}%`, 'F1.3']}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="kpi_rate" 
                        stroke="#F9A51A" 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#0054A6' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
