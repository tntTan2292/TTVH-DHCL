import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageContainer, CardContainer } from '../../components/common/Containers';
import { LoadingLayout, ErrorLayout, EmptyLayout } from '../../components/common/StateLayouts';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // URL State
  const fromDate = searchParams.get('from_date') || new Date().toISOString().split('T')[0];
  const toDate = searchParams.get('to_date') || new Date().toISOString().split('T')[0];
  const interval = searchParams.get('interval') || 'daily';

  // Local State for Mocking API Fetch
  const [state, setState] = useState({
    status: 'loading', // loading, success, error, empty
    data: null,
    error: null
  });

  // Mock Fetch
  useEffect(() => {
    setState(prev => ({ ...prev, status: 'loading' }));
    
    // Simulate API Call
    const timer = setTimeout(() => {
      // Mock D5.2 Contract Data
      const mockData = {
        total_bg: 15200,
        passed_rate: 85.5,
        f13_303_rate: 14.5,
        series: [
          { date: '2026-06-12', f13_303_rate: 10.2 },
          { date: '2026-06-13', f13_303_rate: 12.5 },
          { date: '2026-06-14', f13_303_rate: 15.0 },
          { date: '2026-06-15', f13_303_rate: 18.2 },
          { date: '2026-06-16', f13_303_rate: 14.5 },
        ],
        top_bcvh: [
          { id: 'BC01', name: 'Đống Đa', rate: 5.2 },
          { id: 'BC02', name: 'Hoàn Kiếm', rate: 6.1 },
          { id: 'BC03', name: 'Ba Đình', rate: 7.5 },
        ],
        bottom_bcvh: [
          { id: 'BC99', name: 'Thanh Trì', rate: 25.4 },
          { id: 'BC98', name: 'Gia Lâm', rate: 22.1 },
          { id: 'BC97', name: 'Đông Anh', rate: 19.8 },
        ]
      };
      
      setState({ status: 'success', data: mockData, error: null });
    }, 800);

    return () => clearTimeout(timer);
  }, [fromDate, toDate, interval]);

  const handleFilterChange = (e) => {
    if (state.status === 'loading') return; // Loading Guard: Chống Race Condition & Spam Click
    const { name, value } = e.target;
    setSearchParams(prev => {
      prev.set(name, value);
      return prev;
    });
  };

  const handleRetry = () => {
    setState(prev => ({ ...prev, status: 'loading' }));
    setTimeout(() => setState({ status: 'success', data: state.data, error: null }), 500);
  };

  if (state.status === 'error') return <ErrorLayout error={state.error} onRetry={handleRetry} />;

  return (
    <PageContainer 
      title="Executive Dashboard"
      action={
        <div className="flex items-center space-x-3 bg-white p-2 rounded-lg border border-[var(--color-surface-200)] shadow-sm">
          <input 
            type="date" 
            name="from_date" 
            value={fromDate} 
            onChange={handleFilterChange}
            disabled={state.status === 'loading'}
            className="text-sm border-none focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Từ ngày"
          />
          <span className="text-[var(--color-text-muted)]">-</span>
          <input 
            type="date" 
            name="to_date" 
            value={toDate} 
            onChange={handleFilterChange}
            disabled={state.status === 'loading'}
            className="text-sm border-none focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Đến ngày"
          />
          <select 
            name="interval" 
            value={interval} 
            onChange={handleFilterChange}
            disabled={state.status === 'loading'}
            className="text-sm border-l border-[var(--color-surface-200)] pl-3 ml-1 focus:ring-0 cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Khung thời gian"
          >
            <option value="daily">Daily View</option>
            <option value="weekly">Weekly View</option>
            <option value="monthly">Monthly View</option>
          </select>
        </div>
      }
    >
      {state.status === 'loading' ? (
        <LoadingLayout />
      ) : state.status === 'empty' || !state.data ? (
        <EmptyLayout />
      ) : (
        <div className="space-y-6">
          {/* Alert Banner */}
          {state.data.f13_303_rate > 10 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start" role="alert">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-bold text-red-800">CẢNH BÁO P0: Tỷ lệ chậm nộp tiền vượt ngưỡng 10%</h3>
                <p className="text-sm text-red-700 mt-1">Đề nghị Giám đốc chỉ đạo rà soát ngay các Bưu cục nhóm Đáy.</p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Tổng Bưu Gửi" value={state.data.total_bg.toLocaleString()} />
            <KpiCard title="Tỷ lệ Đạt" value={`${state.data.passed_rate}%`} type="success" />
            <KpiCard title="Tỷ lệ Chậm Nộp" value={`${state.data.f13_303_rate}%`} type="danger" trend="up" />
            <KpiCard title="Bưu Cục Vi Phạm" value="12" type="warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Chart */}
            <CardContainer title={`Xu hướng Chậm Nộp Tiền (${interval})`} className="lg:col-span-2 h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={state.data.series} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="f13_303_rate" 
                    stroke="var(--color-danger-500)" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    name="Tỷ lệ chậm nộp"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContainer>

            {/* Top/Bottom BCVH */}
            <div className="space-y-6">
              <CardContainer title="Bottom 3 Bưu Cục (Kém nhất)" className="h-[176px]">
                <ul className="space-y-3">
                  {state.data.bottom_bcvh.map(bc => (
                    <li key={bc.id} className="flex justify-between items-center group cursor-pointer" onClick={() => navigate(`/ranking/bcvh?from_date=${fromDate}&to_date=${toDate}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/ranking/bcvh`)}>
                      <span className="text-sm font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-primary-600)] transition-colors">{bc.name}</span>
                      <div className="flex items-center text-red-600">
                        <span className="text-sm font-bold mr-2">{bc.rate}%</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContainer>

              <CardContainer title="Top 3 Bưu Cục (Tốt nhất)" className="h-[176px]">
                <ul className="space-y-3">
                  {state.data.top_bcvh.map(bc => (
                    <li key={bc.id} className="flex justify-between items-center group cursor-pointer" onClick={() => navigate(`/ranking/bcvh?from_date=${fromDate}&to_date=${toDate}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/ranking/bcvh`)}>
                      <span className="text-sm font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-primary-600)] transition-colors">{bc.name}</span>
                      <div className="flex items-center text-green-600">
                        <span className="text-sm font-bold mr-2">{bc.rate}%</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContainer>
            </div>
          </div>

          {/* Heatmap Placeholder */}
          <CardContainer title="Ma trận nhiệt (Heatmap) Bưu Cục" className="h-64">
            <div className="w-full h-full bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center rounded text-slate-500">
              <p className="font-medium">Heatmap Component Placeholder</p>
              <p className="text-sm">Chờ API /ranking/bcvh?interval=daily hoàn thiện</p>
            </div>
          </CardContainer>

        </div>
      )}
    </PageContainer>
  );
}

// Subcomponent KPI Card
function KpiCard({ title, value, type = 'default', trend = null }) {
  const colors = {
    default: 'text-[var(--color-text-main)]',
    success: 'text-green-600',
    danger: 'text-red-600',
    warning: 'text-amber-600',
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-[var(--color-surface-200)] shadow-sm flex flex-col justify-between">
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{title}</p>
      <div className="mt-2 flex items-baseline justify-between">
        <h3 className={`text-2xl font-bold ${colors[type]}`}>{value}</h3>
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-red-500" aria-label="Tăng" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-green-500" aria-label="Giảm" />}
      </div>
    </div>
  );
}
