'use strict';

// F12-DASHBOARD-RANKING-01: the F1.2 module total covers every row of the day; the unit ranking, overview,
// weekly and monthly views cover every accepting unit except the large-customer office 531120 (PD-F12-8),
// which is counted in the total and shown apart. F1.2 target rate 95 % (PD-F12-12).
const F12_TARGET_RATE = 95;
const F12_KPI_SCOPE_NOTE =
    'Tổng KPI được tính trên toàn bộ dữ liệu F1.2 (fact_f12). Xếp hạng đơn vị chấp nhận không gồm bưu cục Khách hàng lớn (531120); ' +
    'bưu cục này vẫn được tính vào tổng KPI và hiện riêng trong bảng đơn vị chấp nhận.';

module.exports = { F12_KPI_SCOPE_NOTE, F12_TARGET_RATE };
