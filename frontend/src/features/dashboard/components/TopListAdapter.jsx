import React, { useState, useEffect } from 'react';
import api from '../../../api/client';
import LegacyTopListCard from '../../../components/f13/TopListCard';

export default function TopListAdapter({ fromDate, toDate }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/f13/dashboard/top', { params: { fromDate, toDate } });
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (fromDate && toDate) fetch();
  }, [fromDate, toDate]);

  if (!data) return (
    <div className="space-y-4">
      <div className="h-72 bg-slate-50 animate-pulse rounded-xl"></div>
      <div className="h-72 bg-slate-50 animate-pulse rounded-xl"></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <LegacyTopListCard 
        title="Top 3 Bưu cục Kém nhất (Lowest)" 
        data={data.top3Lowest} 
        type="lowest" 
      />
      <LegacyTopListCard 
        title="Top 3 Tác động (Impact)" 
        data={data.top3Impact} 
        type="impact" 
      />
    </div>
  );
}
