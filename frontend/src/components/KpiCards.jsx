import { Target, CheckCircle2, TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';

export default function KpiCards({ data }) {
  if (!data) return null;

  const cards = [
    { label: 'Hôm nay', value: `${data.today || 0}%`, icon: <Target size={24} className="text-vnpost-blue" />, bg: 'bg-blue-50' },
    { label: 'Hôm qua', value: `${data.yesterday || 0}%`, icon: <Clock size={24} className="text-gray-600" />, bg: 'bg-gray-100' },
    { 
      label: 'Chênh lệch DoD', 
      value: `${data.dod > 0 ? '+' : ''}${data.dod || 0}%`, 
      icon: data.dod >= 0 ? <TrendingUp size={24} className="text-green-600" /> : <TrendingDown size={24} className="text-red-600" />, 
      bg: data.dod >= 0 ? 'bg-green-50' : 'bg-red-50',
      valueColor: data.dod >= 0 ? 'text-green-600' : 'text-red-600'
    },
    { 
      label: 'Chênh lệch SWC', 
      value: `${data.swc > 0 ? '+' : ''}${data.swc || 0}%`, 
      icon: data.swc >= 0 ? <TrendingUp size={24} className="text-green-600" /> : <TrendingDown size={24} className="text-red-600" />, 
      bg: data.swc >= 0 ? 'bg-green-50' : 'bg-red-50',
      valueColor: data.swc >= 0 ? 'text-green-600' : 'text-red-600'
    },
    { label: 'Lũy kế Tuần', value: `${data.weekAcc || 0}%`, icon: <Calendar size={24} className="text-purple-600" />, bg: 'bg-purple-50' },
    { label: 'Lũy kế Tháng', value: `${data.monthAcc || 0}%`, icon: <Calendar size={24} className="text-vnpost-orange" />, bg: 'bg-orange-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((kpi, index) => (
        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 z-10">
            <p className="text-xs font-semibold text-gray-500">{kpi.label}</p>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.bg}`}>
              {kpi.icon}
            </div>
          </div>
          <p className={`text-xl font-black z-10 ${kpi.valueColor || 'text-gray-800'}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
