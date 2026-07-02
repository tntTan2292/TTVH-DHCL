import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Calendar, Activity, TrendingUp, BarChart2 } from 'lucide-react';
import api from '../../api/client';

export default function QualityTimelinePanel({ globalFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {
          toDate: globalFilter.dateRange[1],
          ma_bcvh: globalFilter.ma_bcvh
        };
        const response = await api.get('/f13/dashboard/quality-timeline', { params });
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch quality timeline", err);
        setError('Không thể tải dữ liệu timeline.');
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [globalFilter]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 h-96 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-vnpost-blue border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { daily, weekly, monthly, heatmap, pulse } = data;

  const getStatusColor = (colorStr) => {
    switch(colorStr) {
      case 'red': return '#ef4444';
      case 'orange': return '#f97316';
      case 'green': return '#22c55e';
      case 'blue': return '#3b82f6';
      case 'gray': default: return '#9ca3af';
    }
  };

  const PulseAlert = () => {
    const pulseColors = {
      'red': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', textBold: 'text-red-800', textMuted: 'text-red-700' },
      'orange': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', textBold: 'text-orange-800', textMuted: 'text-orange-700' },
      'green': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', textBold: 'text-green-800', textMuted: 'text-green-700' },
      'blue': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', textBold: 'text-blue-800', textMuted: 'text-blue-700' },
      'gray': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', textBold: 'text-gray-800', textMuted: 'text-gray-700' }
    };
    
    const theme = pulseColors[pulse.color] || pulseColors['gray'];

    return (
      <div className={`p-4 rounded-lg border flex items-start gap-3 mb-6 ${theme.bg} ${theme.border}`}>
        <Activity className={`${theme.text} mt-0.5`} size={20} />
        <div>
          <h4 className={`font-bold ${theme.textBold}`}>Quality Pulse</h4>
          <p className={`${theme.textMuted} text-sm mt-1`}>{pulse.text}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
        <TrendingUp className="text-vnpost-blue" size={24} />
        <h2 className="text-xl font-bold text-gray-800">Quality Timeline & Patterns</h2>
      </div>

      {/* Quality Pulse */}
      <PulseAlert />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Daily Timeline (30 days) */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Activity size={16} /> Xu hướng 30 ngày (Daily Timeline)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => val.slice(5)} />
                <YAxis domain={[80, 100]} tick={{fontSize: 10}} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <ReferenceLine y={95} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '95% Threshold', fill: '#f97316', fontSize: 10 }} />
                <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: '90% Critical', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="kpi_rate" stroke="#3b82f6" strokeWidth={3} dot={{r: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Weekly Pattern (Average by Day of Week) */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <BarChart2 size={16} /> Quy luật Tuần (Weekly Pattern)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 20, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{fontSize: 12, fontWeight: 'bold'}} />
                <YAxis domain={[80, 100]} tick={{fontSize: 10}} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="avg_kpi" radius={[4, 4, 0, 0]}>
                  {weekly.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.color)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Monthly Pattern (Average by Day of Month) */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <TrendingUp size={16} /> Quy luật Tháng (Monthly Pattern)
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorKpi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{fontSize: 10}} interval="preserveStartEnd" minTickGap={20} />
                <YAxis domain={[80, 100]} tick={{fontSize: 10}} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="avg_kpi" stroke="#3b82f6" fillOpacity={1} fill="url(#colorKpi)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Quality Calendar Heatmap */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Calendar size={16} /> Heatmap Lịch Chất Lượng (30 Ngày)
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-500">
                <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
              </div>
              <div className="flex flex-col gap-2">
                {heatmap.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-7 gap-2">
                    {week.map((day, dIdx) => {
                      if (!day) return <div key={dIdx} className="h-12 rounded-md bg-transparent border border-transparent"></div>;
                      
                      const bgColor = day.color === 'green' ? 'bg-green-500' : 
                                      (day.color === 'orange' ? 'bg-orange-500' : 
                                      (day.color === 'red' ? 'bg-red-500' : 'bg-gray-200'));

                      return (
                        <div 
                          key={dIdx} 
                          className={`h-12 rounded-md ${bgColor} text-white flex flex-col items-center justify-center text-xs cursor-pointer hover:opacity-80 transition-opacity relative group`}
                        >
                          <span className="font-bold opacity-90">{day.date.slice(8)}</span>
                          <span className="text-[10px] opacity-80">{day.kpi_rate}%</span>
                          
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-50">
                            {day.date}: {day.kpi_rate}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
