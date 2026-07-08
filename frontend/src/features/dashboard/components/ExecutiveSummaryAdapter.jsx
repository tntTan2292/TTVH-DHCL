import React, { useState, useEffect } from 'react';
import api from '../../../api/client';
import LegacyExecutiveSummary from '../../../components/f13/ExecutiveSummary';

export default function ExecutiveSummaryAdapter({ fromDate, toDate, maBcvh }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/f13/dashboard/kpi', { params: { from_date: fromDate, to_date: toDate, ma_bcvh: maBcvh } });
        if (res.data.success) {
          const apiData = res.data.data;
          // MAP Backend KPI response -> Legacy expected data structure
          const mappedData = {
            today: apiData.passed_rate,
            dod: 0, // Not provided by API yet
            swc: 0, // Not provided by API yet
            tong_buu_gui: apiData.total_bg,
            tong_buu_gui_dod: 0,
            tong_buu_gui_swc: 0,
            buu_gui_dat: Math.round(apiData.total_bg * apiData.passed_rate / 100),
            buu_gui_dat_dod: 0,
            buu_gui_dat_swc: 0,
            buu_gui_khong_dat: Math.round(apiData.total_bg * apiData.failed_rate / 100),
            buu_gui_khong_dat_dod: 0,
            buu_gui_khong_dat_swc: 0,
            f13_303_rate: apiData.f13_303_rate,
            luy_ke_tuan: apiData.passed_rate, // mock fallback
            luy_ke_thang: apiData.passed_rate // mock fallback
          };
          setData(mappedData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (fromDate && toDate) fetch();
  }, [fromDate, toDate, maBcvh]);

  if (!data) return <div className="h-32 bg-slate-50 animate-pulse rounded-xl mb-6"></div>;
  return <LegacyExecutiveSummary data={data} />;
}
