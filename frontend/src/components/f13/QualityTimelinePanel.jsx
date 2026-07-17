import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList,
} from 'recharts';
import { Calendar, Activity, TrendingUp, BarChart2 } from 'lucide-react';
import api from '../../api/client';

function TimelineStateCard({ title, description, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'border-gray-200 bg-gray-50 text-gray-700',
    error: 'border-red-200 bg-red-50 text-red-800',
    empty: 'border-amber-200 bg-amber-50 text-amber-800',
    loading: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-5 ${toneClass}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm">{description}</div>
    </div>
  );
}

function TimelineSurfaceShell({ title, icon, children }) {
  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

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
          ma_bcvh: globalFilter.ma_bcvh,
        };
        const response = await api.get('/f13/dashboard/quality-timeline', { params });
        if (response.data.success) {
          setData(response.data.data);
          return;
        }
        setData(null);
        setError('Không thể tải dữ liệu timeline.');
      } catch (err) {
        console.error('Failed to fetch quality timeline', err);
        setData(null);
        setError('Không thể tải dữ liệu timeline.');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [globalFilter]);

  const surfaceData = data || { daily: [], weekly: [], monthly: [], heatmap: [] };
  const pulse = surfaceData.pulse || {
    text: 'Chưa có dữ liệu để phân tích nhịp đập chất lượng.',
    color: 'gray',
  };

  const hasUsableSurfaceData = Boolean(
    surfaceData.daily?.some((item) => Number(item?.kpi_rate) > 0 || Number(item?.total) > 0)
      || surfaceData.weekly?.some((item) => Number(item?.avg_kpi) > 0)
      || surfaceData.monthly?.some((item) => Number(item?.avg_kpi) > 0)
      || surfaceData.heatmap?.some((week) => Array.isArray(week) && week.some((day) => day && Number(day.kpi_rate) > 0)),
  );

  const renderDaily = (daily = []) => (
    <TimelineSurfaceShell title="Xu hướng 30 ngày (Daily Timeline)" icon={<Activity size={16} />}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5)} />
            <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
            <ReferenceLine
              y={95}
              stroke="#f97316"
              strokeDasharray="3 3"
              label={{ position: 'insideTopLeft', value: '95% Threshold', fill: '#f97316', fontSize: 10 }}
            />
            <ReferenceLine
              y={90}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{ position: 'insideBottomLeft', value: '90% Critical', fill: '#ef4444', fontSize: 10 }}
            />
            <Line type="monotone" dataKey="kpi_rate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </TimelineSurfaceShell>
  );

  const renderWeekly = (weekly = []) => {
    const validWeekly = weekly.filter((d) => d.avg_kpi > 0);
    let weeklyYMax = 100;
    let weeklyYMin = 80;

    if (validWeekly.length > 0) {
      const maxVal = Math.max(...validWeekly.map((d) => d.avg_kpi));
      const minVal = Math.min(...validWeekly.map((d) => d.avg_kpi));
      weeklyYMax = maxVal < 90 ? 90 : (maxVal < 95 ? 95 : 100);
      weeklyYMin = Math.max(0, Math.floor(minVal / 10) * 10 - 10);
    }

    const weeklyVisData = weekly.map((d) => ({
      ...d,
      vis_kpi: d.avg_kpi === 0 ? weeklyYMin + 0.5 : d.avg_kpi,
      is_empty: d.avg_kpi === 0,
    }));

    const CustomBarLabel = (props) => {
      const { x, y, width, value, is_empty } = props;
      if (is_empty) {
        return (
          <text x={x + width / 2} y={y - 5} fill="#9ca3af" fontSize={10} textAnchor="middle">
            No Data
          </text>
        );
      }
      return (
        <text x={x + width / 2} y={y - 5} fill="#4b5563" fontSize={10} textAnchor="middle" fontWeight="bold">
          {value.toFixed(2)}%
        </text>
      );
    };

    const getStatusColor = (colorStr) =>
      ({ red: '#ef4444', yellow: '#eab308', pink: '#ec4899', green: '#22c55e', gray: '#9ca3af' }[colorStr] || '#9ca3af');

    return (
      <TimelineSurfaceShell title="Quy luật Tuần (Weekly Pattern)" icon={<BarChart2 size={16} />}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyVisData} margin={{ top: 20, right: 20, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fontWeight: 'bold' }} />
              <YAxis domain={[weeklyYMin, weeklyYMax]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                formatter={(value, name, props) => [props.payload.is_empty ? 'No Data' : `${props.payload.avg_kpi}%`, 'KPI Trung bình']}
              />
              <Bar dataKey="vis_kpi" radius={[4, 4, 0, 0]}>
                {weeklyVisData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.is_empty ? '#e5e7eb' : getStatusColor(entry.color)} />
                ))}
                <LabelList content={<CustomBarLabel />} dataKey="avg_kpi" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TimelineSurfaceShell>
    );
  };

  const renderMonthly = (monthly = []) => (
    <TimelineSurfaceShell title="Quy luật Tháng (Monthly Pattern)" icon={<TrendingUp size={16} />}>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthly} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="colorKpi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="avg_kpi" stroke="#3b82f6" fillOpacity={1} fill="url(#colorKpi)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </TimelineSurfaceShell>
  );

  const renderHeatmap = (heatmap = []) => (
    <TimelineSurfaceShell title="Heatmap Lịch Chất Lượng (30 Ngày)" icon={<Calendar size={16} />}>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-500">
            <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
          </div>
          <div className="flex flex-col gap-2">
            {heatmap.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-2">
                {week.map((day, dIdx) => {
                  if (!day) {
                    return <div key={dIdx} className="h-12 rounded-md border border-transparent bg-transparent" />;
                  }

                  const bgColor = day.color === 'green'
                    ? 'bg-green-500'
                    : day.color === 'pink'
                      ? 'bg-pink-500'
                      : day.color === 'yellow'
                        ? 'bg-yellow-500'
                        : day.color === 'red'
                          ? 'bg-red-500'
                          : 'bg-gray-200';

                  return (
                    <div
                      key={dIdx}
                      className={`group relative flex h-12 cursor-pointer flex-col items-center justify-center rounded-md text-xs text-white transition-opacity hover:opacity-80 ${bgColor}`}
                    >
                      <span className="font-bold opacity-90">{day.date.slice(8)}</span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] opacity-80">{day.kpi_rate}%</span>
                        {day.dod > 0 ? <TrendingUp size={10} className="text-white opacity-80" /> : day.dod < 0 ? <TrendingUp size={10} className="text-white opacity-80 transform rotate-180" /> : null}
                      </div>
                      <div className="absolute bottom-full z-50 mb-2 hidden w-max rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                        {day.date}: {day.kpi_rate}% {day.dod ? `(${day.dod > 0 ? '+' : ''}${day.dod}%)` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TimelineSurfaceShell>
  );

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
        <TrendingUp className="text-vnpost-blue" size={24} />
        <h2 className="text-xl font-bold text-gray-800">Quality Timeline & Patterns</h2>
      </div>

      <div className={`mb-6 flex items-start gap-3 rounded-lg border p-4 ${pulse.color === 'red' ? 'border-red-200 bg-red-50 text-red-800' : pulse.color === 'yellow' ? 'border-yellow-200 bg-yellow-50 text-yellow-800' : pulse.color === 'green' ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-800'}`}>
        <Activity className="mt-0.5" size={20} />
        <div>
          <h4 className="font-bold">Quality Pulse</h4>
          <p className="mt-1 text-sm">{pulse.text}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TimelineStateCard title="Xu hướng 30 ngày" description="Đang tải dữ liệu timeline..." tone="loading" />
          <TimelineStateCard title="Quy luật tuần" description="Đang tải dữ liệu timeline..." tone="loading" />
          <TimelineStateCard title="Quy luật tháng" description="Đang tải dữ liệu timeline..." tone="loading" />
          <TimelineStateCard title="Heatmap lịch chất lượng" description="Đang tải dữ liệu timeline..." tone="loading" />
        </div>
      ) : !error && !hasUsableSurfaceData ? (
        <TimelineStateCard
          title="Không có dữ liệu timeline"
          description="Dữ liệu timeline đã tải thành công nhưng không có nội dung khả dụng cho daily, weekly, monthly hoặc heatmap."
          tone="empty"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {error ? (
            <>
              <TimelineStateCard title="Xu hướng 30 ngày" description={error} tone="error" />
              <TimelineStateCard title="Quy luật tuần" description={error} tone="error" />
              <TimelineStateCard title="Quy luật tháng" description={error} tone="error" />
              <TimelineStateCard title="Heatmap lịch chất lượng" description={error} tone="error" />
            </>
          ) : (
            <>
              {renderDaily(surfaceData.daily)}
              {renderWeekly(surfaceData.weekly)}
              {renderMonthly(surfaceData.monthly)}
              {renderHeatmap(surfaceData.heatmap)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
