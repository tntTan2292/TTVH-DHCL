import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/client';
import LegacyTopListCard from '../../../components/f13/TopListCard';

export default function TopListAdapter({ fromDate, toDate, interval = 'daily' }) {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  
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

  const handleRowClick = (item) => {
    const params = new URLSearchParams();
    params.set('from_date', fromDate);
    params.set('to_date', toDate);
    params.set('interval', interval);
    params.set('bcvh_id', item.ma_bcvh);
    params.set('bcvh_name', item.ten_bcvh);
    navigate(`/f13/ranking/bcvh?${params.toString()}`);
  };

  if (!data) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start w-full">
      <div className="w-full">
        <div className="h-72 bg-slate-50 animate-pulse rounded-xl"></div>
      </div>
      <div className="w-full">
        <div className="h-72 bg-slate-50 animate-pulse rounded-xl"></div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start w-full">
      <div className="w-full">
        <LegacyTopListCard 
          title="Top 2 BCVH tốt nhất" 
          data={data.best} 
          type="lowest" 
          onRowClick={handleRowClick}
        />
      </div>
      <div className="w-full">
        <LegacyTopListCard 
          title="Top 2 BCVH cần cải thiện" 
          data={data.lowest} 
          type="lowest" 
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
}
