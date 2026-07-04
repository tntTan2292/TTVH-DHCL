import { Target, TrendingUp, TrendingDown, Package, CheckCircle2, XCircle, Award } from 'lucide-react';

const fmtPct = (val) => `${val ?? 0}%`;
const fmtDelta = (val) => `${val > 0 ? '+' : ''}${val ?? 0}%`;
const fmtCount = (val) => (val ?? 0).toLocaleString('vi-VN');

export default function ExecutiveSummary({ data }) {
  if (!data) return null;

  const dodPositive = (data.dod ?? 0) >= 0;
  const swcPositive = (data.swc ?? 0) >= 0;
  
  // Fake rank for demonstration if API doesn't have it yet
  const rank = data.rank || 0;
  const rankDod = data.rankDod || 0; // +/- hôm qua
  const rankSwc = data.rankSwc || 0; // +/- cùng kỳ

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">KPI Toàn Mạng</p>
            <Target size={16} className="text-vnpost-blue" />
          </div>
          <p className="text-2xl font-black text-gray-800">{fmtPct(data.today)}</p>
          <div className="mt-auto pt-3 grid grid-cols-2 gap-2 text-xs border-t border-gray-50">
            <div className={`flex items-center gap-1 ${dodPositive ? 'text-green-600' : 'text-red-600'}`}>
               {dodPositive ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
               <span>{fmtDelta(data.dod)} HQ</span>
            </div>
            <div className={`flex items-center gap-1 ${swcPositive ? 'text-green-600' : 'text-red-600'}`}>
               {swcPositive ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
               <span>{fmtDelta(data.swc)} CK</span>
            </div>
          </div>
        </div>

        {/* Sản lượng */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sản Lượng</p>
            <Package size={16} className="text-vnpost-blue" />
          </div>
          <p className="text-2xl font-black text-gray-800">{fmtCount(data.tong_buu_gui)}</p>
          <div className="mt-auto pt-3 grid grid-cols-2 gap-2 text-xs border-t border-gray-50 text-gray-500">
            <div className="flex items-center gap-1">
               {data.tong_buu_gui_dod >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
               <span>{fmtCount(Math.abs(data.tong_buu_gui_dod))} HQ</span>
            </div>
            <div className="flex items-center gap-1">
               {data.tong_buu_gui_swc >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
               <span>{fmtCount(Math.abs(data.tong_buu_gui_swc))} CK</span>
            </div>
          </div>
        </div>

        {/* Đạt */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-50 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Đạt</p>
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <p className="text-2xl font-black text-green-700">{fmtCount(data.buu_gui_dat)}</p>
          <div className="mt-auto pt-3 grid grid-cols-2 gap-2 text-xs border-t border-gray-50 text-gray-500">
             <div className="flex items-center gap-1">
               {data.buu_gui_dat_dod >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
               <span>{fmtCount(Math.abs(data.buu_gui_dat_dod))} HQ</span>
             </div>
             <div className="flex items-center gap-1">
               {data.buu_gui_dat_swc >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
               <span>{fmtCount(Math.abs(data.buu_gui_dat_swc))} CK</span>
             </div>
          </div>
        </div>

        {/* Không đạt */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-50 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Không Đạt</p>
            <XCircle size={16} className="text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-600">{fmtCount(data.buu_gui_khong_dat)}</p>
          <div className="mt-auto pt-3 grid grid-cols-2 gap-2 text-xs border-t border-gray-50 text-gray-500">
             <div className="flex items-center gap-1">
               {data.buu_gui_khong_dat_dod <= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
               <span>{fmtCount(Math.abs(data.buu_gui_khong_dat_dod))} HQ</span>
             </div>
             <div className="flex items-center gap-1">
               {data.buu_gui_khong_dat_swc <= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
               <span>{fmtCount(Math.abs(data.buu_gui_khong_dat_swc))} CK</span>
             </div>
          </div>
        </div>

        {/* Xếp hạng */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-50 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Xếp Hạng</p>
            <Award size={16} className="text-vnpost-orange" />
          </div>
          <p className="text-2xl font-black text-vnpost-orange">{rank > 0 ? `#${rank}` : 'N/A'}</p>
          {rank > 0 && (
            <div className="mt-auto pt-3 grid grid-cols-2 gap-2 text-xs border-t border-gray-50">
              <div className={`flex items-center gap-1 ${rankDod <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                 {rankDod <= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                 <span>{Math.abs(rankDod)} bậc HQ</span>
              </div>
              <div className={`flex items-center gap-1 ${rankSwc <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                 {rankSwc <= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                 <span>{Math.abs(rankSwc)} bậc CK</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
