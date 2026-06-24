import React, { useState } from 'react';
import UploadWidget from './components/UploadWidget';
import KpiCards from './components/KpiCards';
import BcvhTable from './components/BcvhTable';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Fixed demo date range based on our fake data files F1.3-2026.06.17.xlsx
  const [dateRange] = useState({
    startDate: '2026-06-01',
    endDate: '2026-06-30'
  });

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
            <p className="text-gray-500 mt-1">Hệ thống Điều hành Chất lượng TTVH (MVP Demo)</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 text-sm font-medium text-gray-600">
            Kỳ báo cáo: {dateRange.startDate} — {dateRange.endDate}
          </div>
        </header>

        {/* Upload Widget */}
        <section>
          <UploadWidget onUploadSuccess={handleUploadSuccess} />
        </section>

        {/* KPI Cards */}
        <section>
          <KpiCards refreshTrigger={refreshTrigger} dateRange={dateRange} />
        </section>

        {/* BCVH Ranking Table */}
        <section>
          <BcvhTable refreshTrigger={refreshTrigger} dateRange={dateRange} />
        </section>
        
      </div>
    </div>
  );
}

export default App;
